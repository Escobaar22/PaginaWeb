var express = require('express');
var router = express.Router();
var mysql = require("mysql2/promise");

var session = require('express-session'); //importamos el session para poder utilizar el login
router.use(session({
  secret: 'contraseña-de-cifrado', // se utiliza para encriptar los datos de los inicios de sesión
  resave: false,
  saveUninitialized: false
}));

const dbConnfig= {
  host: "localhost",
  user: "root",
  password: "631534833Poly",
  database: "paginaweb"
};

const getConnection = async () => {
  try{
    const connection = await mysql.createConnection(dbConnfig);
    console.log("Conexion establecida");
    return connection;
  }catch(error){
    console.log(error)
    throw new Error("Error al conectar con la base de datos")
  }
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Portada' });
});

router.get("/login", function (req, res, next) {
  res.render("login",{ title: "Login", error: null });
});

router.post("/login", async function (req, res, next) {
  try {
    // Obtener los datos del formulario
    const { correo, contrasena } = req.body;

    // Establecer la conexión con la base de datos
    const connection = await getConnection();

    // Buscar al usuario en la tabla "usuarios"
    const [rows, fields] = await connection.execute(
      "SELECT * FROM usuarios WHERE correo = ? AND contrasena = ?",
      [correo, contrasena]
    );

    // Cerrar la conexión con la base de datos
    await connection.end();

    // Verificar si se encontró al usuario y crear una sesión si es así
    if (rows.length > 0) {
      req.session.userId = rows[0].id; // Establecer el id del usuario como una variable de sesión

      // Redireccionar al usuario a la última página visitada antes de iniciar sesión, o a la página de inicio si no se especificó ninguna
      const redirectTo = req.session.redirectTo || "/";
      delete req.session.redirectTo;
      res.redirect(redirectTo);
    } else {
      res.render("login", { title: "Login", error: "Credenciales inválidas" }); // Mostrar un mensaje de error si las credenciales son inválidas
    }
  } catch (error) {
    console.log(error);
    res.send("Error al iniciar sesión");
  }
});

// Ruta para el formulario de registro
router.get("/registro", function(req, res, next) {
  res.render("registro", { title: "Registro", error: null });
});

router.post("/registro", async function(req, res, next) {
  try {
    // Obtener los datos del formulario
    const { nombre, correo, contrasena } = req.body;

    if (!nombre || !correo || !contrasena) {
      throw new Error("Debe llenar todos los campos");
    }

    // Establecer la conexión con la base de datos
    const connection = await getConnection();

    // Verificar si el correo ya está registrado
    const [existingUser] = await connection.execute(
      "SELECT * FROM usuarios WHERE correo = ?",
      [correo]
    );

    if (existingUser.length > 0) {
      throw new Error("El correo ya está registrado");
    }

    // Insertar los datos del usuario en la tabla "usuarios"
    const [result] = await connection.execute(
      "INSERT INTO usuarios (nombre, correo, contrasena) VALUES (?, ?, ?)",
      [nombre, correo, contrasena]
    );

    // Cerrar la conexión con la base de datos
    await connection.end();

    // Redireccionar al usuario a la página de inicio de sesión
    res.redirect("/login");
  } catch (error) {
    console.log(error);
    res.render("registro", { error: error.message });
  }
});

router.get("/cuenta", function(req, res, next) {
  res.render("cuenta", { title: "Cuenta", error: null });
});




// Ruta GET para la página "productos"
router.get('/productos', async function (req, res, next) {
  try {
    // Establecer la conexión con la base de datos
    const connection = await getConnection();

    // Realizar la consulta SQL para obtener los datos de la tabla "productos"
    const [rows, fields] = await connection.execute('SELECT * FROM productos');

    // Cerrar la conexión con la base de datos
    await connection.end();

    // Pasar los datos obtenidos a la vista
    res.render('productos', { title: 'Nuestros Productos', productos: rows, filtro: undefined });
  } catch (error) {
    console.log(error);
    res.send('Error al obtener los productos');
  }
});

// Ruta POST para la página "productos" con filtro
router.post('/productos', async function (req, res, next) {
  const { filtro } = req.body;

  try {
    // Establecer la conexión con la base de datos
    const connection = await getConnection();

    let query = 'SELECT * FROM productos';

    switch (filtro) {
      case 'Camisetas':
        query += " WHERE categoria = 'camiseta'";
        break;
      case 'Pantalones':
        query += " WHERE categoria = 'pantalon'";
        break;
      case 'Chaquetas':
        query += " WHERE categoria = 'chaqueta'";
        break;
    }

    const [rows] = await connection.execute(query);

    // Cerrar la conexión con la base de datos
    await connection.end();

    res.render('productos', { title: 'Nuestros Productos', productos: rows, filtro: filtro });
  } catch (error) {
    console.log(error);
    res.send('Error al obtener los productos');
  }
});


router.get('/producto', async function (req, res, next) {
  const productId = req.query.id; // Obtener el ID del producto desde los parámetros de la URL

  try {
    // Realizar la consulta SQL para obtener los detalles del producto según el ID
    const connection = await getConnection();
    const [rows, fields] = await connection.execute('SELECT * FROM productos WHERE id = ?', [productId]);
    await connection.end();

    if (rows.length > 0) {
      // Si se encontró un producto con el ID especificado, renderiza la vista "producto" y pasa los detalles del producto como datos al renderizador
      res.render('producto', { title: 'Producto', producto: rows[0] });
    } else {
      // Si no se encontró ningún producto con el ID especificado, renderiza la vista "producto" con un mensaje de error
      res.render('producto', { title: 'Producto', error: 'Producto no encontrado' });
    }
  } catch (error) {
    console.log(error);
    res.send('Error al obtener los detalles del producto');
  }
});







router.get('/contacto', function(req, res, next) {
  res.render('contacto', { title: 'Datos de contacto' });
});

router.get('/usuario', function(req, res, next) {
  res.render('usuario', { title: 'Gestion de usuario' });
});

router.get('/carrito', function(req, res, next) {
  res.render('carrito', { title: 'Carrito' });
});

module.exports = router;
