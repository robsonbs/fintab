function canPerformAction(userFeatures, requiredFeature) {
  let authorized = false;

  if (userFeatures.includes(requiredFeature)) {
    authorized = true;
  }

  return authorized;
}

function canPerformAnyAction(userFeatures, requiredFeatures) {
  return requiredFeatures.some((feature) => userFeatures.includes(feature));
}

function canPerformAllActions(userFeatures, requiredFeatures) {
  return requiredFeatures.every((feature) => userFeatures.includes(feature));
}

export default {
  canPerformAction,
  canPerformAnyAction,
  canPerformAllActions,
};
