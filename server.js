const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');

const app = express();


//Middleware
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy","default-src * 'unsafe-inline' 'unsafe-eval'");
    next();
});


// Routes
const sessionsRouter = require('./routes/sessions');

const usersRouter = require('./routes/users');


app.use('/sessions', sessionsRouter);
app.use('/users', usersRouter);

// Frontend path
const FRONTEND_PATH = path.join(__dirname,'frontend');
app.use(express.static(FRONTEND_PATH));
app.get('*', (req, res) => { res.sendFile(path.join(FRONTEND_PATH,'index.html'));
});

const PORT =process.env.PORT || 5008;
const server = http.createServer(app);




server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = server;



