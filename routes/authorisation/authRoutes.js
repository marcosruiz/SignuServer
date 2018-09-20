
module.exports = (router, expressApp, authRoutesMethods) => {

    router.post('/register', registerUser);

    router.post('/login', login);

    return router;
};

function registerUser(req, res){};


function login(req, res){};