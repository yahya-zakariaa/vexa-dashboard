export const errorHandler = (err, req, res, next) => {
  console.log("error middleWare:", err);
  if (err.name === "CastError") {
    return res.status(400).json({
      status: "error",
      message: `Invalid ${err.path} ID: ${err.value}`,
    });
  }

  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({
      status: "error",
      message: messages.join(", "),
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      status: "error",
      message: `Duplicate field value: ${JSON.stringify(err.keyValue)}`,
    });
  }

  return res.status(500).json({
    status: "error",
    message: err.message || "Something went wrong!",
  });
};
