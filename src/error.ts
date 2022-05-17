export class ExtensionInstallError extends Error {
  constructor() {
    super();
    this.name = 'ExtensionInstallError';
    Object.setPrototypeOf(this, ExtensionInstallError.prototype);
  }
}
