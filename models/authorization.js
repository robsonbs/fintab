import { InternalServerError } from "infra/errors.js";

const availableFeatures = [
  // USER
  "create:user",
  "read:user",
  "read:user:self",
  "update:user",
  "update:user:others",

  // SESSION
  "create:session",
  "read:session",

  // ACTIVATION_TOKEN
  "read:activation_token",

  // MIGRATION
  "create:migration",
  "read:migration",

  // STATUS
  "read:status",
  "read:status:all",
];

function canPerformAction(user, requiredFeature, resource) {
  validateUser(user);
  validateFeature(requiredFeature);
  let authorized = false;

  if (user.features.includes(requiredFeature)) {
    authorized = true;
  }

  if (requiredFeature === "update:user" && resource) {
    authorized = false;
    if (
      user.id === resource.id ||
      canPerformAction(user, "update:user:others", resource)
    ) {
      authorized = true;
    }
  }

  return authorized;
}

function canPerformAnyAction(user, requiredFeatures) {
  return requiredFeatures.some((feature) => user.features.includes(feature));
}

function canPerformAllActions(user, requiredFeatures) {
  return requiredFeatures.every((feature) => user.features.includes(feature));
}

function filterOutput(user, requiredFeature, resource) {
  validateUser(user);
  validateFeature(requiredFeature);
  validateResource(resource);

  if (requiredFeature === "read:user") {
    return {
      id: resource.id,
      username: resource.username,
      features: resource.features,
      created_at: resource.created_at,
      updated_at: resource.updated_at,
    };
  }

  if (requiredFeature === "read:user:self") {
    if (user.id === resource.id) {
      return {
        id: resource.id,
        username: resource.username,
        email: resource.email,
        features: resource.features,
        created_at: resource.created_at,
        updated_at: resource.updated_at,
      };
    }
  }

  if (requiredFeature === "read:activation_token") {
    return {
      id: resource.id,
      user_id: resource.user_id,
      used_at: resource.used_at,
      expires_at: resource.expires_at,
      created_at: resource.created_at,
      updated_at: resource.updated_at,
    };
  }

  if (requiredFeature === "read:session") {
    if (user.id === resource.user_id) {
      return {
        id: resource.id,
        token: resource.token,
        user_id: resource.user_id,
        expires_at: resource.expires_at,
        created_at: resource.created_at,
        updated_at: resource.updated_at,
      };
    }
  }

  if (requiredFeature === "read:migration") {
    return resource.map((migration) => ({
      id: migration.id,
      name: migration.name,
      timestamp: migration.timestamp,
    }));
  }

  if (requiredFeature === "read:status") {
    const outpout = {
      updated_at: resource.updated_at,
      dependencies: {
        database: {
          max_connections: resource.dependencies.database.max_connections,
          open_connections: resource.dependencies.database.open_connections,
        },
      },
    };
    if (canPerformAction(user, "read:status:all")) {
      outpout.dependencies.database.version =
        resource.dependencies.database.version;
      outpout.dependencies.database.environment =
        resource.dependencies.database.environment;
    }
    return outpout;
  }
}

function validateUser(user) {
  if (!user || !user.features) {
    throw new InternalServerError({
      cause:
        "É necessário fornecer `user` no model `authorization` para verificar permissões.",
    });
  }
}

function validateFeature(feature) {
  if (!feature || !availableFeatures.includes(feature)) {
    throw new InternalServerError({
      cause:
        "É necessário fornecer uma `feature` conhecida no model `authorization`.",
    });
  }
}

function validateResource(resource) {
  if (!resource) {
    throw new InternalServerError({
      cause:
        "É necessário fornecer um `resource` em `authorization.filterOutput()`.",
    });
  }
}

export default {
  canPerformAction,
  canPerformAnyAction,
  canPerformAllActions,
  filterOutput,
};
