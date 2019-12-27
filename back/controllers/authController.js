const User = require('../models/User')
const { check, validationResult } = require('express-validator')
const logger = require('../services/logger')
const bcrypt = require('bcryptjs')

/**
 * The authentication controller
 * @module authController
 */
var authController = {}

/**
 * The register function
 * @member register
 * @function
 * @param {Object} req - the request
 * @param {Object} res - the response
 */
authController.register = async function(req, res) {
  try {
    const errors = validationResult(req) // Finds the validation errors in this request and wraps them in an object with handy functions

    if (!errors.isEmpty()) {
      res.status(422).json({ errors: errors.array() })
      return
    }
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: err })
    return
  }

  const userData = {
    username: req.body.username,
    password: req.body.password,
    email: req.body.email,
  }

  User.create(userData, (err, user) => {
    if (err) {
      logger.error(err)
      res.status(500).json({ error: err.message })
    } else {
      // Save user info in session
      req.session.userId = user._id
      req.session.username = user.username
      res.cookie('username', user.username)

      res.status(201).json({ username: user.username })
    }
  })
}

/**
 * The login function
 * @member login
 * @function
 * @param {Object} req - the request
 * @param {Object} res - the response
 */
authController.login = async function(req, res) {
  try {
    const errors = validationResult(req) // Finds the validation errors in this request and wraps them in an object with handy functions

    if (!errors.isEmpty()) {
      res.status(422).json({ errors: errors.array() })
      return
    }

    const username = req.body.username
    const password = req.body.password

    const user = await User.findOne({ username: username })
    if (user) {
      if (bcrypt.compareSync(password, user.password)) {
        // Create token here
        // const token = jwt.sign({ sub: user.id }, config.secret)

        // Save user info in session
        req.session.userId = user._id
        req.session.username = user.username
        res.cookie('username', user.username)

        res
          .status(200)
          .json({ success: true, user: { username: user.username } })
      } else {
        res.status(401).json({ success: false, message: 'Wrong password' })
      }
    } else
      res
        .status(404)
        .json({ success: false, message: 'Wrong email and/or password' })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: err })
  }
}

/**
 * The logout function
 * @member logout
 * @function
 * @param {Object} req - the request
 * @param {Object} res - the response
 */
authController.logout = async function(req, res, next) {
  console.log(req.session.userId)
  req.session.destroy(function(err) {
    if (err) {
      return next(err)
    } else {
      res.clearCookie('username')
      return res.redirect('/')
    }
  })
}

authController.validate = method => {
  switch (method) {
    case 'register': {
      return [
        check('username', 'Username missing').exists(),
        check('password', 'Password missing').exists(),
        check('email', 'Email missing').exists(),
        check('email', 'Email format wrong').isEmail(),
      ]
    }
    case 'login': {
      return [
        check('username', 'Username missing').exists(),
        check('password', 'Password missing').exists(),
      ]
    }
  }
}

/**
 * The myAccount function
 * @member myAccount
 * @function
 * @param {Object} req - the request
 * @param {Object} res - the response
 */

authController.account = async function(req, res, next) {
  console.log(req.session.userId) // Pouquoi undefined ?
  if (req.session.userId) {
    res.status(200).json({
      success: true,
      user: { username: req.session.user, email: req.session.email },
    })
  } else {
    res.status(401).json({ success: false, message: "session doesn't exist !" })
  }
}

module.exports = authController
