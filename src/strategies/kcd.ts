import { redirect, SessionStorage } from "@remix-run/server-runtime";
import { Strategy, StrategyOptions } from "../authenticator";
import crypto from "../crypto/index";

export interface KCDSendEmailOptions<User> {
  emailAddress: string;
  magicLink: string;
  user?: User | null;
  domainUrl: string;
}

export interface KCDSendEmailFunction<User> {
  (options: KCDSendEmailOptions<User>): Promise<void>;
}

/**
 * Validate the email address the user is trying to use to login.
 * This can be useful to ensure it's not a disposable email address.
 * @param emailAddress The email address to validate
 */
export interface KCDVerifyEmailFunction {
  (email: string): Promise<void>;
}

/**
 * The content of the magic link payload
 */
export interface KCDMagicLinkPayload {
  /**
   * The email address used to authenticate
   */
  emailAddress: string;
  /**
   * When the magic link was created, as an ISO string. This is used to check
   * the email link is still valid.
   */
  creationDate: string;
  /**
   * If it should be validated or not.
   */
  validateSessionMagicLink: boolean;
}

export interface KCDStrategyOptions<User> {
  /**
   * The endpoint the user will go after clicking on the email link.
   * A whole URL is not required, the pathname is enough, the strategy will
   * detect the host of the request and use it to build the URL.
   * @default "/magic"
   */
  callbackURL?: string;
  /**
   * A function to send the email. This function should receive the email
   * address of the user and the URL to redirect to and should return a Promise.
   * The value of the Promise will be ignored.
   */
  sendEmail: KCDSendEmailFunction<User>;
  /**
   * A function to validate the email address. This function should receive the
   * email address as a string and return a Promise. The value of the Promise
   * will be ignored, in case of error throw an error.
   *
   * By default it only test the email against the RegExp `/.+@.+/`.
   */
  verifyEmailAddress?: KCDVerifyEmailFunction;
  /**
   * A secret string used to encrypt and decrypt the token and magic link.
   */
  secret: string;
  /**
   * The name of the form input used to get the email.
   * @default "email"
   */
  emailField?: string;
  /**
   * The param name the strategy will use to read the token from the email link.
   * @default "token"
   */
  magicLinkSearchParam?: string;
  /**
   * How long the magic link will be valid. Default to 30 minutes.
   * @default 1_800_000
   */
  linkExpirationTime?: number;
  /**
   * The key on the session to store any error message.
   * @default "kcd:error"
   */
  sessionErrorKey?: string;
  /**
   * The key on the session to store the magic link.
   * @default "kcd:magicLink"
   */
  sessionMagicLinkKey?: string;
  /**
   * Add an extra layer of protection and validate the magic link is valid.
   * @default false
   */
  validateSessionMagicLink?: boolean;
}

export interface KCDStrategyVerifyCallback<User> {
  (emailAddress: string): Promise<User>;
}

let verifyEmailAddress: KCDVerifyEmailFunction = async (email) => {
  if (!/.+@.+/.test(email)) throw new Error("A valid email is required.");
};

export class KCDStrategy<User> implements Strategy<User> {
  name = "kcd";

  private verify: KCDStrategyVerifyCallback<User>;
  private emailField = "email";
  private callbackURL: string;
  private sendEmail: KCDSendEmailFunction<User>;
  private validateEmail: KCDVerifyEmailFunction;
  private secret: string;
  private magicLinkSearchParam: string;
  private linkExpirationTime: number;
  private sessionErrorKey: string;
  private sessionMagicLinkKey: string;
  private validateSessionMagicLink: boolean;

  constructor(
    options: KCDStrategyOptions<User>,
    verify: KCDStrategyVerifyCallback<User>
  ) {
    this.verify = verify;
    this.sendEmail = options.sendEmail;
    this.callbackURL = options.callbackURL ?? "/magic";
    this.secret = options.secret;
    this.sessionErrorKey = options.sessionErrorKey ?? "kcd:error";
    this.sessionMagicLinkKey = options.sessionMagicLinkKey ?? "kcd:magiclink";
    this.validateEmail = options.verifyEmailAddress ?? verifyEmailAddress;
    this.emailField = options.emailField ?? this.emailField;
    this.magicLinkSearchParam = options.magicLinkSearchParam ?? "token";
    this.linkExpirationTime = options.linkExpirationTime ?? 1000 * 60 * 30; // 30 minutes
    this.validateSessionMagicLink = options.validateSessionMagicLink ?? false;
  }

  async authenticate(
    request: Request,
    sessionStorage: SessionStorage,
    options: StrategyOptions
  ): Promise<User> {
    let session = await sessionStorage.getSession(
      request.headers.get("Cookie")
    );

    // This should only be called in an action if it's used to start the login
    // process
    if (request.method === "POST") {
      if (!options.successRedirect) {
        throw new Error(
          "Missing successRedirect. The successRedirect is required for POST requests."
        );
      }

      // get the email address from the request body
      let body = new URLSearchParams(await request.text());
      let emailAddress = body.get(this.emailField);

      // if it doesn't have an email address,
      if (!emailAddress) {
        let message = "Missing email address.";
        if (!options.failureRedirect) throw new Error(message);
        session.flash(this.sessionErrorKey, message);
        let cookie = await sessionStorage.commitSession(session);
        throw redirect(options.failureRedirect, {
          headers: { "Set-Cookie": cookie },
        });
      }

      try {
        // Validate the email address
        await this.validateEmail(emailAddress);

        let domainUrl = this.getDomainURL(request);

        let magicLink = await this.sendToken(emailAddress, domainUrl);

        session.set(this.sessionMagicLinkKey, await this.encrypt(magicLink));
        throw redirect(options.successRedirect, {
          headers: {
            "Set-Cookie": await sessionStorage.commitSession(session),
          },
        });
      } catch (error) {
        if (!options.failureRedirect) throw error;
        let message = (error as Error).message;
        session.flash(this.sessionErrorKey, message);
        let cookie = await sessionStorage.commitSession(session);
        throw redirect(options.failureRedirect, {
          headers: { "Set-Cookie": cookie },
        });
      }
    }

    let user: User;

    try {
      // If we get here, the user clicked on the magic link inside email
      let magicLink = session.get(this.sessionMagicLinkKey) ?? "";
      let email = await this.validateMagicLink(
        request.url,
        await this.decrypt(magicLink)
      );
      // now that we have the user email we can call verify to get the user
      user = await this.verify(email);
    } catch (error) {
      // if something happens, we should redirect to the failureRedirect
      // and flash the error message, or just throw the error if failureRedirect
      // is not defined
      if (!options.failureRedirect) throw error;
      let message = (error as Error).message;
      session.flash(this.sessionErrorKey, message);
      let cookie = await sessionStorage.commitSession(session);
      throw redirect(options.failureRedirect, {
        headers: { "Set-Cookie": cookie },
      });
    }

    if (!options.successRedirect) return user;

    // remove the magic link from the session
    session.unset(this.sessionMagicLinkKey);
    session.set(options.sessionKey, user);
    let cookie = await sessionStorage.commitSession(session);
    throw redirect(options.successRedirect, {
      headers: { "Set-Cookie": cookie },
    });
  }

  private getDomainURL(request: Request): string {
    let host =
      request.headers.get("X-Forwarded-Host") ?? request.headers.get("host");

    if (!host) {
      throw new Error("Could not determine domain URL.");
    }

    let protocol = host.includes("localhost") ? "http" : "https";
    return `${protocol}://${host}`;
  }

  private createMagicLinkPayload(emailAddress: string): KCDMagicLinkPayload {
    return {
      emailAddress,
      creationDate: new Date().toISOString(),
      validateSessionMagicLink: this.validateSessionMagicLink,
    };
  }

  private async getMagicLink(emailAddress: string, domainUrl: string) {
    let payload = this.createMagicLinkPayload(emailAddress);
    let stringToEncrypt = JSON.stringify(payload);
    let encryptedString = await this.encrypt(stringToEncrypt);
    let url = new URL(domainUrl);
    url.pathname = this.callbackURL;
    url.searchParams.set(this.magicLinkSearchParam, encryptedString);
    return url.toString();
  }

  private async sendToken(emailAddress: string, domainUrl: string) {
    let magicLink = await this.getMagicLink(emailAddress, domainUrl);

    let user = await this.verify(emailAddress).catch(() => null);

    await this.sendEmail({
      emailAddress,
      magicLink,
      user,
      domainUrl,
    });

    return magicLink;
  }

  private async encrypt(value: string): Promise<string> {
    return await crypto.encrypt(await crypto.generateKey(this.secret), value);
  }

  private async decrypt(value: string): Promise<string> {
    return await crypto.decrypt(await crypto.generateKey(this.secret), value);
  }

  private getMagicLinkCode(link: string) {
    try {
      let url = new URL(link);
      return url.searchParams.get(this.magicLinkSearchParam) ?? "";
    } catch {
      return "";
    }
  }

  private async validateMagicLink(
    requestUrl: string,
    sessionMagicLink?: string
  ) {
    let linkCode = this.getMagicLinkCode(requestUrl);
    let sessionLinkCode = sessionMagicLink
      ? this.getMagicLinkCode(sessionMagicLink)
      : null;

    let emailAddress, linkCreationDateString, validateSessionMagicLink;
    try {
      let decryptedString = await this.decrypt(linkCode);
      let payload = JSON.parse(decryptedString) as KCDMagicLinkPayload;
      emailAddress = payload.emailAddress;
      linkCreationDateString = payload.creationDate;
      validateSessionMagicLink = payload.validateSessionMagicLink;
    } catch (error: unknown) {
      console.error(error);
      throw new Error("Sign in link invalid. Please request a new one.");
    }

    if (typeof emailAddress !== "string") {
      throw new TypeError("Sign in link invalid. Please request a new one.");
    }

    if (validateSessionMagicLink) {
      if (!sessionLinkCode) {
        throw new Error("Sign in link invalid. Please request a new one.");
      }
      if (linkCode !== sessionLinkCode) {
        throw new Error(
          `You must open the magic link on the same device it was created from for security reasons. Please request a new link.`
        );
      }
    }

    if (typeof linkCreationDateString !== "string") {
      throw new TypeError("Sign in link invalid. Please request a new one.");
    }

    let linkCreationDate = new Date(linkCreationDateString);
    let expirationTime = linkCreationDate.getTime() + this.linkExpirationTime;
    if (Date.now() > expirationTime) {
      throw new Error("Magic link expired. Please request a new one.");
    }
    return emailAddress;
  }
}
