const express = require("express"); // npm i express
const axios = require("axios"); // npm i axios
const app = express();
const port = 3012;
const path = require("path");
const methodOverride = require("method-override"); // npm i method-override
const starwarsJson = require("./starwars.json");
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

//Para poder leer datos del request body en métodos post tenemos que hacer:
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(methodOverride("_method"));

app.get("/", (req, res) => {
	res.redirect("search.html");
});

function modificarJson(json) {
	for (let p of json) {
		p.photo = "../images/" + p.name.split(" ")[0] + ".jpg";
        p.slug = p.name.replace(/\s+/g, '-');
	}
	return json;
}

let jsonModificado = modificarJson(starwarsJson);
console.log(jsonModificado);



// GET /starwars (Listar o Buscar por query string)
// Ruta /starwars (Maneja tanto el listado general como la búsqueda por query string "q")
app.get("/starwars", async (req, res) => {
    try {
        const { q } = req.query;

        // CASO 1: En caso negativo (no hay queryString), listará todas las imágenes
        if (!q || q.trim() === "") {
            return res.render("starwars.ejs", { personajes: jsonModificado });
        }

        // CASO 2: En caso de existir "q", buscará coincidencias en el vector del JSON
        const terminoBusqueda = q.toLowerCase().trim();
        const personaje = jsonModificado.find(p => 
            p.name.toLowerCase().includes(terminoBusqueda)
        );

        if (!personaje) {
            return res.render("error.ejs", { msg: `No se encontró ningún personaje para: "${q}"` });
        }

        // --- LÓGICA DE MOSTRAR (Incluyendo el planeta de la API / Homeworld) ---
        let homeworldData = null;
        if (personaje.homeworld) {
            try {
                const response = await axios.get(personaje.homeworld);
                homeworldData = {
                    name: response.data.name,
                    rotation_period: response.data.rotation_period,
                    orbital_period: response.data.orbital_period
                };
            } catch (apiError) {
                console.error("Error al consultar SWAPI");
            }
        }

        // IMPORTANTE: Muestra los detalles directamente (como pide el enunciado para la búsqueda)
        res.render("show.ejs", { 
            personaje: { ...personaje, homeworldData }
        });

    } catch (error) {
        res.render("error.ejs", { msg: "Error al procesar la solicitud." });
    }
});

// GET /starwars/new (Vista crear - Debe ir ANTES de /starwars/:nombre)
app.get("/starwars/new", (req, res) => {
    res.render("new.ejs");
});

// GET /starwars/:nombre (Mostrar detalle + Llamada API Homeworld con Try-Catch)
app.get("/starwars/:nombre", async (req, res) => {
    try {
        const nombre = req.params.nombre;
        const personaje = jsonModificado.find(p => p.name.toLowerCase() === nombre.toLowerCase());

        if (!personaje) {
            return res.render("error.ejs", { msg: "Personaje no encontrado." });
        }

        let homeworldData = null;
        if (personaje.homeworld) {
            try {
                const response = await axios.get(personaje.homeworld);
                homeworldData = {
                    name: response.data.name,
                    rotation_period: response.data.rotation_period,
                    orbital_period: response.data.orbital_period
                };
            } catch (apiError) {
                console.error("Error en API");
            }
        }

        res.render("show.ejs", { 
            personaje: { ...personaje, homeworldData }
        });

    } catch (error) {
        res.render("error.ejs", { msg: "Error al mostrar el personaje." });
    }
});

// GET /starwars/:nombre/edit (Vista Editar)
app.get("/starwars/:nombre/edit", (req, res) => {
    const personaje = jsonModificado.find(p => p.name.toLowerCase() === req.params.nombre.toLowerCase());
    if (!personaje) {
        return res.render("error.ejs", { msg: "Personaje no encontrado." });
    }
    res.render("edit.ejs", { personaje });
});

// PATCH /starwars/:nombre (Actualizar)
app.patch("/starwars/:nombre", (req, res) => {
    const { height, mass } = req.body;
    const personaje = jsonModificado.find(p => p.name.toLowerCase() === req.params.nombre.toLowerCase());
    
    if (personaje) {
        personaje.height = height;
        personaje.mass = mass;
        return res.redirect(`/starwars/${(personaje.name)}`);
    }
    res.render("error.ejs", { msg: "No se pudo actualizar el personaje." });
});

// DELETE /starwars/:nombre (Destruir)
app.delete("/starwars/:nombre", (req, res) => {
    const index = jsonModificado.findIndex(p => p.name.toLowerCase() === req.params.nombre.toLowerCase());
    if (index !== -1) {
        jsonModificado.splice(index, 1);
        return res.redirect("/starwars");
    }
    res.render("error.ejs", { msg: "No se pudo eliminar el personaje." });
});

// POST /starwars (Crear)
app.post("/starwars", (req, res) => {
    const { name, height, mass, photo } = req.body;
    const nuevoPersonaje = { name, height, mass, photo, homeworld: null };
    jsonModificado.push(nuevoPersonaje);
    res.redirect(`/starwars/${(name)}`);
});

//levantar el server
app.listen(port, () => {
	console.log(`http://localhost:${port}`);
});
