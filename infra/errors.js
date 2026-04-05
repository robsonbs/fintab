export class InternalServerError extends Error {
  constructor({ cause, statusCode }) {
    super("Um erro interno ocorreu. Por favor, tente novamente mais tarde.", {
      cause,
    });
    this.name = "InternalServerError";
    this.action = "Entre em contato com o suporte.";
    this.statusCode = statusCode || 500;
  }
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}

export class MethodNotAllowedError extends Error {
  constructor() {
    super("Método não permitido para este endpoint.");
    this.name = "MethodNotAllowedError";
    this.action =
      "Verifique se o método HTTP utilizado é suportado por este endpoint e tente novamente.";
    this.statusCode = 405;
  }
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}

export class ServiceError extends Error {
  constructor({ cause, message }) {
    super(
      message || "Serviço indisponível. Por favor, tente novamente mais tarde.",
      {
        cause,
      },
    );
    this.name = "ServiceError";
    this.action = "Verifique a disponibilidade do serviço e tente novamente.";
    this.statusCode = 503;
  }
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}

export class ValidationError extends Error {
  constructor({ message, action }) {
    super(
      message ||
        "Os dados enviados são inválidos. Por favor, ajuste e tente novamente.",
    );
    this.action = action || "Ajuste os dados enviados e tente novamente.";
    this.name = "ValidationError";
    this.statusCode = 400;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}
