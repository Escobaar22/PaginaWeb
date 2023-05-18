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
router.get('/', async function (req, res, next) {
  try{
    //Conexión a la base de datos
    const connection = await getConnection();

    //Realizamos la consulta para que solo se nos muestre una serie de productos segun su id
    const[rows, fields] = await connection.execute('SELECT * FROM productos WHERE id IN (8, 12, 14)');

    await connection.end();


    res.render('index', { title: 'Portada', productos: rows });
  }
  catch(error){
    console.log(error);
    res.send("Error al obtener los productos");
  }
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

router.get("/cuenta", async function(req, res, next) {
  try{
    //Verificar que haya una sesión iniciada
    if(!req.session.userId){
      req.session.redirectTo = "/cuenta";
      //Si no existe una sesión, redireccionar al login
      res.redirect("/login");
      return;
    }

    const connection = await getConnection();

    const[rows, fields] = await connection.execute(
      "SELECT * FROM usuarios WHERE id = ?",
      [req.session.userId]
    );

    await connection.end();

    if (rows.length > 0) {
      const nombreUsuario = rows[0].nombre;
      const correoUsuario = rows[0].correo;
      const direccionUsuario = rows[0].direccion;
      const telefonoUsuario = rows[0].telefono;
      const cumpleanosUsuario = rows[0].cumpleanos;
      const contrasenaUsuario = rows[0].contrasena;
    res.render("cuenta", { title: "Cuenta", nombreUsuario: nombreUsuario, correoUsuario: correoUsuario, direccionUsuario: direccionUsuario, 
     telefonoUsuario: telefonoUsuario, cumpleanosUsuario:cumpleanosUsuario, contrasenaUsuario:contrasenaUsuario,  error: null });
    } else {
      res.send("Usuario no encontrado");
    }
  }
  catch (error) {
    console.log(error);
    res.send("Error al cargar la página de la cuenta");
  }
});

router.post("/cuenta", async function(req, res, next){
  try {
    // Obtén los valores enviados desde el formulario
    const oldPassword = req.body.oldPassword;
    const newPassword = req.body.newPassword;
    const confirmPassword = req.body.confirmPassword;

    // Establecer la conexión con la base de datos
    const connection = await getConnection();

    // Obtener los datos del usuario de la base de datos
    const [rows, fields] = await connection.execute(
      "SELECT * FROM usuarios WHERE id = ?",
      [req.session.userId]
    );

    // Verificar si el usuario existe
    if (rows.length > 0) {
      const storedPassword = rows[0].contrasena;

      // Verificar si la contraseña actual coincide con la almacenada en la base de datos
      if (storedPassword === oldPassword) {
        // Verificar si la nueva contraseña y la confirmación coinciden
        if (newPassword === confirmPassword) {
          // Actualizar la contraseña en la base de datos
          await connection.execute(
            "UPDATE usuarios SET contrasena = ? WHERE id = ?",
            [newPassword, req.session.userId]
          );

          res.redirect("/cuenta");
        } else {
          res.send("La nueva contraseña y la confirmación no coinciden");
        }
      } else {
        res.send("La contraseña actual es incorrecta");
      }
    } else {
      res.send("Usuario no encontrado");
    }

    // Cierra la conexión con la base de datos
    await connection.end();
  } catch (error) {
    console.log(error);
    res.send("Error al cambiar la contraseña");
  }
})

router.post("/cuenta/datos", async function(req, res, next) {
  try {
    // Obtén los valores enviados desde el formulario
    const address = req.body.address;
    const phone = req.body.phone;
    const birthdate = req.body.birthdate;

    // Establecer la conexión con la base de datos
    const connection = await getConnection();

    // Actualizar los datos adicionales en la base de datos
    await connection.execute(
      "UPDATE usuarios SET direccion = ?, telefono = ?, cumpleanos = ? WHERE id = ?",
      [address, phone, birthdate, req.session.userId]
    );

    // Cierra la conexión con la base de datos
    await connection.end();

    res.redirect("/cuenta");
  } catch (error) {
    console.log(error);
    res.send("Error al guardar los datos adicionales");
  }
});

router.get("/logout", function(req, res, next) {
  
  // Destruir la sesión y redirigir al usuario a la página de inicio de sesión
  req.session.destroy(function(err) {
    if (err) {
      console.log(err);
    }
    res.redirect("/login"); // Cambia "/login" por la ruta de tu página de inicio de sesión
  });
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
      case 'Sudaderas':
        query += " WHERE categoria = 'sudadera'";
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

router.get('/carrito', async function(req, res, next) {
  try{

    const connection = await getConnection();

    const [rows, fields] = await connection.execute('SELECT * FROM productos WHERE id IN (1, 10, 14)');

    await connection.end();
    res.render('carrito', { title: 'Carrito', productos: rows });
  }
  catch(error) {
    console.log(error);
    res.send("Error al obtener los productos");
  }
});



router.post('/carrito', async function(req, res, next) {
  const productId = req.query.id;  // Obtener el ID del producto de la solicitud POST

  try {

    const connection = await getConnection();

    // Actualizar el stock del producto en la base de datos
    await connection.execute('UPDATE productos SET stock = stock - 1 WHERE id = ?', [productId]);

    // Renderizar la vista del carrito con el aviso correspondiente
    res.render('carrito', { title: 'Carrito', mensaje: 'El producto se eliminó del carrito.' });
  } catch (error) {
    // Manejar cualquier error que haya ocurrido durante la ejecución
    console.error(error);
    res.send("Error al eliminar el producto del carrito.");
  }
});

module.exports = router;


module.exports = router;
