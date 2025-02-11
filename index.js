const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const app = express();
const port = 3001;
const bodyParser = require('body-parser');

// Configurar CORS
app.use(cors());
app.use(bodyParser.json());

// Configurar la conexión a MySQL
const db = mysql.createConnection({
  host: 'b5uahwru1xyik6x9uggw-mysql.services.clever-cloud.com',
  user: 'u61toaxgmskpip7f',
  password: 'DptUvBrLb8UsdSKT3ZWf',
  database: 'b5uahwru1xyik6x9uggw'
});

db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('Conectado a MySQL');
});

// Ruta para crear un nuevo contrato con rubros
app.post('/contratos', (req, res) => {
  const newContrato = req.body;
  const sqlContrato = 'INSERT INTO contratos (N_Contrato, Objeto, Clase_de_contrato, Fecha_inicio, Fecha_fin, valor_contrato, valor_consumido, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';

  db.beginTransaction((err) => {
    if (err) {
      console.error('Error al iniciar la transacción:', err);
      return res.status(500).send('Error al iniciar la transacción');
    }

    db.query(sqlContrato, [newContrato.N_Contrato, newContrato.Objeto, newContrato.Clase_de_contrato, newContrato.Fecha_inicio, newContrato.Fecha_fin, newContrato.valor_contrato, newContrato.valor_consumido, newContrato.estado], (err, result) => {
      if (err) {
        return db.rollback(() => {
          console.error('Error al crear el contrato:', err);
          res.status(500).send('Error al crear el contrato');
        });
      }

      const rubros = newContrato.rubros;
      const sqlRubro = 'INSERT INTO contrato_rubro (N_Contrato, Id_rubro, Valor_Rubro, Valor_Rubro_Consumido) VALUES (?, ?, ?, ?)';

      rubros.forEach((rubro, index) => {
        db.query(sqlRubro, [newContrato.N_Contrato, rubro.Id_rubro, rubro.Valor_Rubro, rubro.Valor_Rubro_Consumido], (err, result) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error al agregar el rubro al contrato:', err);
              res.status(500).send('Error al agregar el rubro al contrato');
            });
          }

          if (index === rubros.length - 1) {
            db.commit((err) => {
              if (err) {
                return db.rollback(() => {
                  console.error('Error al confirmar la transacción:', err);
                  res.status(500).send('Error al confirmar la transacción');
                });
              }
              res.json(newContrato);
            });
          }
        });
      });
    });
  });
});

// Ruta para obtener los contratos
app.get('/contratos', (req, res) => {
  const sql = 'SELECT N_Contrato,Objeto,Clase_de_contrato,valor_contrato,valor_consumido,estado, Fecha_inicio, Fecha_fin FROM contratos';
  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json(result);
  });
});

// Ruta para obtener los productos con el nombre del rubro
app.get('/productos', (req, res) => {
  const sql = `
    SELECT p.id_producto, p.nombre, p.valor_costo, p.valor_venta, p.estado, r.nombre AS rubro_nombre, p.Id_rubro
    FROM producto p
    LEFT JOIN rubro r ON p.Id_rubro = r.Id_rubro
  `;
  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json(result);

  });
});

// Ruta para crear un nuevo producto
app.post('/productos', (req, res) => {
  const newProduct = req.body;
  const sql = 'INSERT INTO producto (nombre, valor_costo, valor_venta, estado, Id_rubro) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [newProduct.nombre, newProduct.valor_costo, newProduct.valor_venta, newProduct.estado, newProduct.Id_rubro], (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    newProduct.id_producto = result.insertId; // Obtener el ID generado por la base de datos
    res.json(newProduct);
  });
});
// Ruta para actualizar un producto
app.put('/productos/:id_producto', (req, res) => {
  const { id_producto } = req.params;
  const updatedProduct = req.body;
  const sql = 'UPDATE producto SET nombre = ?, valor_costo = ?, valor_venta = ?, estado = ?, Id_rubro = ? WHERE id_producto = ?';
  db.query(sql, [updatedProduct.nombre, updatedProduct.valor_costo, updatedProduct.valor_venta, updatedProduct.estado, updatedProduct.Id_rubro, id_producto], (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json(updatedProduct);
  });
});

// Ruta para obtener las remisiones
app.get('/remisiones', (req, res) => {
  const sql = `
  SELECT re.id_remision, re.fecha, re.N_Contrato, r.nombre AS rubro_nombre, r.Id_rubro
  FROM remision re
  LEFT JOIN rubro r ON re.Id_rubro = r.Id_rubro
  `;
  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json(result);
  });
});

// Ruta para obtener la información completa de una remisión
app.get('/remisiones/:id_remision', (req, res) => {
  const { id_remision } = req.params;
  const sql = `
    SELECT r.id_remision, r.fecha, rb.nombre AS rubro, rp.id_producto, p.nombre AS producto, rp.cantidad
    FROM remision r
    JOIN rubro rb ON r.Id_rubro = rb.Id_rubro
    JOIN remision_producto rp ON r.id_remision = rp.id_remision
    JOIN producto p ON rp.id_producto = p.id_producto
    WHERE r.id_remision = ?
  `;
  db.query(sql, [id_remision], (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json(result);
  });
});

// Ruta para crear una nueva remisión
app.post('/remisiones', (req, res) => {
  const newRemision = req.body;
  const sqlRemision = 'INSERT INTO remision (fecha, N_Contrato, Id_rubro) VALUES (?, ?, ?)';
  
  db.beginTransaction((err) => {
    if (err) {
      console.error('Error al iniciar la transacción:', err);
      return res.status(500).send('Error al iniciar la transacción');
    }

    db.query(sqlRemision, [newRemision.fecha, newRemision.N_Contrato, newRemision.Id_rubro], (err, result) => {
      if (err) {
        return db.rollback(() => {
          console.error('Error al crear la remisión:', err);
          res.status(500).send('Error al crear la remisión');
        });
      }

      const id_remision = result.insertId; // Obtener el ID generado por la base de datos

      // Insertar los productos y cantidades en la tabla intermedia
      const productos = newRemision.productos;
      const sqlProducto = 'INSERT INTO remision_producto (id_remision, id_producto, cantidad, precio_venta, precio_costo, total) VALUES ?';
      const values = productos.map(producto => [id_remision, producto.id_producto, producto.cantidad, producto.valor_venta, producto.valor_costo, producto.cantidad * producto.valor_venta]);

      db.query(sqlProducto, [values], (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error('Error al insertar los productos de la remisión:', err);
            res.status(500).send('Error al insertar los productos de la remisión');
          });
        }

        // Calcular el valor total de la remisión
        const valorTotalRemision = productos.reduce((sum, producto) => sum + (producto.cantidad * producto.valor_venta), 0);

        // Actualizar `valor_Rubro_Consumido` en la tabla `contrato_rubro`
        const sqlUpdateContratoRubro = 'UPDATE contrato_rubro SET valor_Rubro_Consumido = valor_Rubro_Consumido + ? WHERE N_Contrato = ? AND Id_rubro = ?';
        db.query(sqlUpdateContratoRubro, [valorTotalRemision, newRemision.N_Contrato, newRemision.Id_rubro], (err, result) => {
          if (err) {
            return db.rollback(() => {
              console.error('Error al actualizar valor_Rubro_Consumido:', err);
              res.status(500).send('Error al actualizar valor_Rubro_Consumido');
            });
          }

          db.commit((err) => {
            if (err) {
              return db.rollback(() => {
                console.error('Error al confirmar la transacción:', err);
                res.status(500).send('Error al confirmar la transacción');
              });
            }
            res.status(201).send('Remisión creada y valor_Rubro_Consumido actualizado');
          });
        });
      });
    });
  });
});

app.get('/remisiones_Edit/:id_remision', (req, res) => {
  const { id_remision } = req.params;
  const sql = `
    SELECT r.id_remision, r.fecha, r.N_Contrato, rb.Id_rubro, rb.nombre AS rubro, rp.id_producto, p.nombre AS producto, rp.cantidad, rp.precio_costo, rp.precio_venta, p.estado
    FROM remision r
    JOIN rubro rb ON r.Id_rubro = rb.Id_rubro
    JOIN remision_producto rp ON r.id_remision = rp.id_remision
    JOIN producto p ON rp.id_producto = p.id_producto
    WHERE r.id_remision = ?
  `;
  db.query(sql, [id_remision], (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    console.log(result); // Verifica los datos aquí
    res.json(result);
  });
});


app.put('/remisiones_Edit/:id_remision', (req, res) => {
  const { id_remision } = req.params;
  const updatedRemision = req.body;
  const sql = 'UPDATE remision SET fecha = ?, N_Contrato = ?, Id_rubro = ? WHERE id_remision = ?';

  db.beginTransaction((err) => {
    if (err) {
      console.error('Error al iniciar la transacción:', err);
      return res.status(500).send('Error al iniciar la transacción');
    }

    db.query(sql, [updatedRemision.fecha, updatedRemision.N_Contrato, updatedRemision.Id_rubro, id_remision], (err, result) => {
      if (err) {
        return db.rollback(() => {
          console.error('Error al actualizar la remisión:', err);
          res.status(500).send('Error al actualizar la remisión');
        });
      }

      const deleteSql = 'DELETE FROM remision_producto WHERE id_remision = ?';
      db.query(deleteSql, [id_remision], (err, result) => {
        if (err) {
          return db.rollback(() => {
            console.error('Error al eliminar productos de la remisión:', err);
            res.status(500).send('Error al eliminar productos de la remisión');
          });
        }

        const productos = updatedRemision.productos;
        const insertSql = 'INSERT INTO remision_producto (id_remision, id_producto, cantidad, precio_venta, precio_costo, total) VALUES (?, ?, ?, ?, ?, ?)';
        productos.forEach((producto, index) => {
          producto.total = producto.cantidad * producto.valor_venta;
          db.query(insertSql, [id_remision, producto.id_producto, producto.cantidad, producto.valor_venta, producto.valor_costo, producto.total], (err, result) => {
            if (err) {
              return db.rollback(() => {
                console.error('Error al agregar productos a la remisión:', err);
                res.status(500).send('Error al agregar productos a la remisión');
              });
            }

            if (index === productos.length - 1) {
              db.commit((err) => {
                if (err) {
                  return db.rollback(() => {
                    console.error('Error al confirmar la transacción:', err);
                    res.status(500).send('Error al confirmar la transacción');
                  });
                }
                res.json(updatedRemision);
              });
            }
          });
        });
      });
    });
  });
});
// Ruta para obtener los productos por rubro
app.get('/productos/rubro/:Id_rubro', (req, res) => {
  const { Id_rubro } = req.params;
  const sql = 'SELECT * FROM producto WHERE Id_rubro = ?';
  db.query(sql, [Id_rubro], (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json(result);
  });
});

// Ruta para obtener los rubros
app.get('/rubros', (req, res) => {
  const sql = 'SELECT * FROM rubro';
  db.query(sql, (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json(result);
  });
});

// Ruta para crear un nuevo rubro
app.post('/rubros', (req, res) => {
  const newRubro = req.body;
  const sql = 'INSERT INTO rubro (nombre) VALUES (?)';
  db.query(sql, [newRubro.nombre], (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    newRubro.Id_rubro = result.insertId; // Obtener el ID generado por la base de datos
    res.json(newRubro);
  });
});

// Ruta para obtener los rubros vinculados a un contrato
app.get('/contratos/:N_Contrato/rubros', (req, res) => {
  const { N_Contrato } = req.params;
  const sql = `
    SELECT r.Id_rubro, r.nombre
    FROM contrato_rubro cr
    JOIN rubro r ON cr.Id_rubro = r.Id_rubro
    WHERE cr.N_Contrato = ?
  `;
  db.query(sql, [N_Contrato], (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json(result);
  });
});

app.get('/consolidado', (req, res) => {
  const { fechaInicio, fechaFin, contrato, rubro } = req.query;
  let sql = `
    SELECT r.id_remision, r.fecha, r.N_Contrato, rb.nombre AS rubro, p.nombre AS producto, rp.cantidad, rp.precio_costo, rp.precio_venta AS valor_venta, rp.total, cr.valor_Rubro
    FROM remision r
    JOIN remision_producto rp ON r.id_remision = rp.id_remision
    JOIN producto p ON rp.id_producto = p.id_producto
    JOIN rubro rb ON r.Id_rubro = rb.Id_rubro
    JOIN contrato_rubro cr ON r.N_Contrato = cr.N_Contrato AND rb.Id_rubro = cr.Id_rubro
    WHERE r.fecha BETWEEN ? AND ?
  `;

  const params = [fechaInicio, fechaFin];

  if (contrato) {
    sql += ' AND r.N_Contrato = ?';
    params.push(contrato);
  }

  if (rubro) {
    sql += ' AND rb.Id_rubro = ?';
    params.push(rubro);
  }

  db.query(sql, params, (err, result) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json(result);
  });
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});