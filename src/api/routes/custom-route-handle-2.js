export default async (req, res) => {
    try {
        return res.sendStatus(200);
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
}
