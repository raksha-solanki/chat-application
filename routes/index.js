var express = require('express');
var router = express.Router();
var users = require('./users')
var passport = require('passport')
var localStrategy = require('passport-local')
var chats = require('./chat')
passport.use(new localStrategy(users.authenticate()))
const mongoose = require('mongoose')

mongoose.connect('mongodb://0.0.0.0/wpppp').then(result => {
  console.log("Connected to database")
}).catch(err => {
  console.log(err)
})

async function clearSockets() {
  var allUser = await users.find()
  await Promise.all(
    allUser.map(async user => {
      user.currentSocket = ''
      await user.save()
    })
  )
}

// clearSockets()

/* GET home page. */
router.get('/', isloggedIn, async function (req, res, next) {
  try {
    // Query optimization: Adding index on 'username' field
    var currentUser = await users.findOne({
      username: req.user.username
    }).populate('chats');

    if (!currentUser) {
      // Error handling: If user not found
      throw new Error("User not found");
    }

    res.render('index', { user: currentUser });
  } catch (error) {
    // Error handling: Handle error
    console.error("Error fetching current user:", error);
    res.status(500).send("Internal Server Error");
  }
});


router.post('/register', (req, res, next) => {
  var newUser = {
    //user data here
    username: req.body.username,
    pic: req.body.pic,
    //user data here
  };
  users
    .register(newUser, req.body.password)
    .then((result) => {
      passport.authenticate('local')(req, res, () => {
        //destination after user register
        res.redirect('/');
      });
    })
    .catch((err) => {
      res.send(err);
    });
});

router.get('/register', (req, res, next) => {
  res.render('register')
})

router.post(
  '/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
  }),
  (req, res, next) => { }
);

router.get('/login', (req, res, next) => {
  res.render('login')
})

function isloggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  else res.redirect('/login');
}
router.post('/findUser', async (req, res, next) => {
  var findUser = await users.findOne({
    username: req.body.data
  })
  if (findUser) {
    res.status(200).json({
      isUserThere: true,
      user: findUser,
    })
  }
  else {
    res.status(200).json({
      isUserThere: false,
    })
  }
})

router.post('/getChat', isloggedIn, async (req, res, next) => {
  var currentUsername = req.user._id
  var oppositeUser = await users.findOne({
    username: req.body.oppositeUser
  })

  var userChats = await chats.find({
    $or: [
      {
        fromUser: currentUsername
      }, {
        fromUser: oppositeUser._id
      }
    ],
    $or: [
      {
        toUser: currentUsername
      }, {
        toUser: oppositeUser._id
      }
    ]
  }).populate('fromUser').populate("toUser")
  res.status(200).json({
    userChats
  })

})

  
module.exports = router;
