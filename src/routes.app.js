import userRoutes from "./backEnd-Routes/user.backEnd.routes.js";
import userfrontEndRoutes from "./frontEnd-Routes/user.frontEnd.routes.js";
import tempalteFrontEndRoutes from "./frontEnd-Routes/template.frontEnd.routes.js";
import contactFrontEndRoutes from "./frontEnd-Routes/contactList.frontEnd.routes.js";
import templatesRoutes from "./backEnd-Routes/template.backEnd.routes.js";
import contactListRoute from "./backEnd-Routes/contactList.backEnd.routes.js";
import settingsFrontRoute from "./frontEnd-Routes/setting.frontEnd.routes.js";
import settingsbackEndRoute from "./backEnd-Routes/settings.backEnd.routes.js"
import app from "./static.app.js";

app.use("/", userfrontEndRoutes, tempalteFrontEndRoutes);
app.use("/settings", settingsFrontRoute);
app.use("/contact-list", contactFrontEndRoutes);
app.use("/api/templates", templatesRoutes);
app.use("/api/users", userRoutes);
app.use("/api/contact-list", contactListRoute);
app.use("/api/settings", settingsbackEndRoute);

export default app;
