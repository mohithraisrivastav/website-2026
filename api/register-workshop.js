module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const data = req.body || {};
        if (!data.name || !data.email) {
            return res.status(400).json({ success: false, error: 'Missing registration details' });
        }

        return res.status(200).json({
            success: true,
            message: 'Workshop registration received'
        });
    } catch (err) {
        console.error('register-workshop error:', err);
        return res.status(500).json({ success: false, error: err.message || 'Registration failed' });
    }
};
