const utilsReq = require('../utils/VerifyRequest')
const Question = require('../models/Question')
const logger = require('../services/logger')
const gameService = require('../services/gameService')
const AWSService = require('../services/AWSService')

const { check, param, validationResult } = require('express-validator')

/**
 * The game controller
 * @module gameController
 */
var gameController = {}

/**
 *  choose a random english word and give us the prounonciation url
 * @member randomWord
 * @function
 * @param {Object} req - the request
 * @param {Object} res - the response
 */
gameController.randomWord = async function (req, res) {
  // Vérification des toutes les données requises
  utilsReq.verify(req)

  const randomWord = gameService.getRandomWord()
  console.log('random word : ', randomWord)

  gameService.getRemainingTrial(req.query.difficulty, (err, remainingTrial) => {
    if (err) {
      res.status(422).json({ error: 'La difficulté doit être easy, medium, hard ou sandbox' })
    }
    // On créé un enregistrement en bdd
    const questionData = {
      idUser: req.session.userId,
      wordToFind: randomWord,
      remainingTrial: remainingTrial,
      difficulty: req.query.difficulty,
      language: req.query.language
    }

    Question.create(questionData, (err, question) => {
      if (err) {
        logger.error(err)
        res.status(500).json({ error: err.message })
      } else {
        AWSService.translate(req.query.language, randomWord, (err, wordTranslated) => {
          console.log('wordtranslated', wordTranslated)
          if (err)
            res.status(500).json({ error: err.message })
          else {
            let langAWS
            switch (req.query.language) {
              case 'fr':
                langAWS = 'fr-FR'
                break
              case 'es':
                langAWS = 'es-ES'
                break
              case 'it':
                langAWS = 'it-IT'
                break
              case 'de':
                langAWS = 'de-DE'
                break
              case 'en':
                langAWS = 'en-US'
                break
            }
            AWSService.pronounce(langAWS, wordTranslated, (err, url) => {
              if (err)
                res.status(500).json({ error: err.message })
              else
                res.status(200).json({ pronunciation: url })
            })
          }
        })
      }
    })
  })
}

/**
 * translate a given word (in english) in a given language
 * @member translate
 * @function
 * @param {Object} req - the request
 * @param {Object} res - the response
 */
gameController.translate = async function (req, res) {
  AWSService.translate(req.query.language, req.query.word, (err, wordTranslated) => {
    if (err) {
      res.status(400).json({ error: 'error' })
      console.log(err, err.stack)
    } else {
      res.status(200).json({ translation: wordTranslated })
    }
  })
}

/**
 * return pronunciation of word in a specific language
 * @member translate
 * @function
 * @param {Object} req - the request
 * @param {Object} res - the response
 */
gameController.pronounce = async function (req, res) {
  AWSService.pronounce(req.query.language, req.query.word, (err, url) => {
    if (err) {
      res.status(500).json({ message: err })
    } else {
      // return a mp3 URL that can be used on the client side (with an HTML audio player) to read the word
      res.status(200).json({ pronunciation: url })
    }
  })
}

/**
 * Permet à l'utilisateur de vérifier s'il a trouvé le bon mot
 * @param req
 * @param res
 * @returns {Promise<void>}
 */
gameController.verify = async function (req, res) {
  const idUser = req.session.userId
  const wordUser = req.body.word
  Question.findOne(
    { idUser: idUser },
    undefined,
    {
      sort: {
        createdAt: -1 //Sort by Date DESC
      }
    },
    (err, question) => {
      console.log(question)
      if (err)
        res.status(500).json({ message: err })
      if (question.remainingTrial !== -1 && question.remainingTrial <= 0) {
        res.status(403).json({ 'message': 'Plus d\'essai restant' })
      }
      if (wordUser === question.wordToFind) {
        res.status(200).json({ 'message': 'BRAVO' })
        // TODO Update pour dire que le mot a été trouvé
      }
      // TODO décrémente le nb d'essai restant
    })
}

gameController.validate = method => {
  switch (method) {
    case 'randomWord': {
      return [
        param('difficulty', 'difficulty missing').exists(),
      ]
    }
  }
}

module.exports = gameController
