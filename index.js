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
const token = 'EAAE3lPwLjZBIBALuH9ZC2jzoaDJ6L18UrUtB4b5wnbSeGn8CxC8x9P5NfyrJrxvNhcbsqsAdGfepUrtaNlMcOvZB4MtUIrL1lY0XVZBwDiAaF2apgkTpVKzorqfY7hKzb5Qh9VH0Cdpgp3jWMtT5zfQpfmRpIGHJTfwirZCSmcmBjNQ2prIUe';
const msgWelcome = 'Bienvenido a Jacob Chatbot';
const msgWelcome2 = 'Ingresa tu código postal para informarte sobre el clima en tu zona';
const msgError = '¡Ups! Parece que no enviaste un código postal';

function validatePostalCode(value) {
    return /^[0-9]{5}$/.test(value);
}

function kelvinToCelsius(kelvin) {
	return (parseFloat(kelvin) - 273.15);
}

app.get('webhook', (req, res) => {
    if(req.query['hub.verify_token'] === 'jacob_secret_token') { 
        res.send(req.query['hub.challengue']);
    }
    res.send('Token invalido');
});

app.post('/webhook/', function(req, res) {
	let messaging_events = req.body.entry[0].messaging;
	let zip_code = 0;
	for(let i = 0; i < messaging_events.length; i++) {
		let event = messaging_events[i];
		let sender = event.sender.id;
		if(event.message && event.message.text) {
            let text = event.message.text;
            if(text === 'Empezar') {
                sendText(sender, msgWelcome);
                sendText(sender, msgWelcome2);
            } else {
                if(validatePostalCode(text)) {
					flag = true;
					zip_code = text;
					break;
                }
            }
		}
	}
	if(flag) {
		let options = {
			uri: `http://api.openweathermap.org/data/2.5/weather?zip=${ zip_code },mx&APPID=fb3c355effc42120a6334c03cb8291ba`,
			json: true
		};
		rp(options)
			.then(function (apiResponse) {
				let temp = kelvinToCelsius(apiResponse.main['temp']);
				let place = apiResponse.name;
				sendText(sender, `La temperatura de ${place} es: ${temp}`);
			})
			.catch(function (err) {
				console.log('error', err);
			});
	} else {
		sendText(sender, msgError);
	}
	
	res.sendStatus(200);
});

function sendText(sender, textToSend) {
	let options = {
		method: 'POST',
		uri: 'https://graph.facebook.com/v2.6/me/messages',
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