import User from "../models/user.model.js";

const getUserData = async (req, res, next) => {
  console.log("hello");
  const { id } = req.user;
  try {
    const user = await User.findById(id);
    if (!user)
      return res
        .status(401)
        .json({ status: "error", message: "User not found" });

    return res.status(200).json({
      status: "success",
      data: user,
    });
  } catch (error) {
    console.log(error);

    return next(error);
  }
};

export { getUserData };
