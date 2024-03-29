require('dotenv').config()
const express = require('express');;
const bodyParser = require('body-parser');
const rp = require('request-promise');

const app = express();

app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('¡Hola!');
});

// Facebook
const token = process.env.FACEBOOK_TOKEN;
const msgWelcome = 'Bienvenido a Jacob Chatbot \nIngresa tu código postal para informarte sobre el clima en tu zona';
const msgError = '¡Ups! Parece que no enviaste un código postal';

function validatePostalCode(value) {
    return /^[0-9]{5}$/.test(value);
}

function kelvinToCelsius(kelvin) {
	return (parseFloat(kelvin) - 273.15);
}

app.get('/webhook/', function(req, res) {
	if (req.query['hub.verify_token'] === "jacob_secret_token") {
		res.send(req.query['hub.challenge'])
	}
	res.send("Wrong token")
});

app.post('/webhook/', function(req, res) {
	let messaging_events = req.body.entry[0].messaging;
	const event = messaging_events[0];
	const sender = event.sender.id;
	for(let i = 0; i < messaging_events.length; i++) {
		if(event.message && event.message.text) {
            let text = event.message.text;
            if(text === 'Empezar') {
				sendText(sender, msgWelcome);
				break;
            } else if(validatePostalCode(text)) {
				let options = {
					uri: `http://api.openweathermap.org/data/2.5/weather?zip=${ text },mx&APPID=${ process.env.OPENWEATHER_TOKEN }`,
					json: true
				};
				rp(options)
					.then(function (apiResponse) {
						let temp = kelvinToCelsius(apiResponse.main['temp']);
						let place = apiResponse.name;
						sendText(sender, `La temperatura de ${place} es: ${temp} grados`);
					})
					.catch(function (err) {
						console.log('error', err);
					});
				break;
			} else {
				sendText(sender, msgError);
			}
		}
	}
	
	res.sendStatus(200);
});

function sendText(sender, textToSend) {
	let options = {
		method: 'POST',
		uri: 'https://graph.facebook.com/v2.6/me/messages',
		qs : {access_token: token},
		body: {
			recipient: { id: sender },
			message: { text: textToSend},
		},
		json: true
	};
	rp(options)
		.then(function (parsedBody) {
			console.log(parsedBody);
		})
		.catch(function (err) {
			console.log('error: ', err);
		});
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}...`);
});