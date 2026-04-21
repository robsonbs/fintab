function canPerformAction(user, requiredFeature, resource) {
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

export default {
  canPerformAction,
  canPerformAnyAction,
  canPerformAllActions,
};
