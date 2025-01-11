import userRoutes from "./backEnd-Routes/user.backEnd.routes.js";
import userfrontEndRoutes from "./frontEnd-Routes/user.frontEnd.routes.js";
import tempalteFrontEndRoutes from "./frontEnd-Routes/template.frontEnd.routes.js";
import contactFrontEndRoutes from "./frontEnd-Routes/contactList.frontEnd.routes.js";
import templatesRoutes from "./backEnd-Routes/template.backEnd.routes.js";
import contactListRoute from "./backEnd-Routes/contactList.backEnd.routes.js";
import settingsFrontRoute from "./frontEnd-Routes/setting.frontEnd.routes.js";
import settingsbackEndRoute from "./backEnd-Routes/settings.backEnd.routes.js";
import faceBookBackEndRoute from "./backEnd-Routes/facebook.backEnd.routes.js";
import reportsFrontEndRoute from "./frontEnd-Routes/reports.frontEnd.routes.js";
import addedUserRouter from "./frontEnd-Routes/addedUser.routes.js";
import { checkSession } from "./middleWares/checkSession.js";
import app from "./static.app.js";

app.use("/", addedUserRouter);
app.use("/api/facebook", faceBookBackEndRoute);
app.use("/", userfrontEndRoutes);
app.use("/api/users", userRoutes);

app.use("/", checkSession, tempalteFrontEndRoutes);
app.use("/reports", checkSession, reportsFrontEndRoute);
app.use("/settings", checkSession, settingsFrontRoute);
app.use("/contact-list", checkSession, contactFrontEndRoutes);
app.use("/api/templates", checkSession, templatesRoutes);
app.use("/api/contact-list", checkSession, contactListRoute);
app.use("/api/settings", checkSession, settingsbackEndRoute);

export default app;
