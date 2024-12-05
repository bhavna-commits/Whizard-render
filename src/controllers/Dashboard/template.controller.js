

export const createTemplate = async (req, res) => {
    const data = req.body;
    req.session.user.template = data;
}