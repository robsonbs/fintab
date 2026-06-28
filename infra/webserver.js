function getOrigin() {
  if (["test", "development"].includes(process.env.NODE_ENV)) {
    return `http://localhost:${process.env.PORT}`;
  }
  if (process.env.VERCEL_ENV === "preview") {
    return `https://${process.env.VERCEL_URL}`;
  }

  return process.env.ORIGIN;
}

const webserver = {
  origin: getOrigin(),
};

export default webserver;
