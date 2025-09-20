const router = express.Router()

const User = require("../models/userModel");
const { signupUser, loginUser } = require('../controllers/userController');

const app = express()

// Signup 
router.post('/signup',signupUser);

// Login
router.post('/login', loginUser);

// Current user
router.get('/me',(req, res) => {
    res.json(req.user);
})

module.exports = router;
