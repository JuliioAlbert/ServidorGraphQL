//Modelos de BASE de DATOS
const Usuario = require('../models/usuario');
const Proyecto = require('../models/proyecto');
const Tarea = require('../models/tarea');
//encriptacion
const bcryptjs = require('bcryptjs');

//JsonWebToken
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: 'variables.env' });


//Crea y firma un json web token 

const crearToken = (usuario, secreta, expiresIn) => {
    const { id, email, nombre } = usuario;
    return jwt.sign({ id, email,nombre }, secreta, { expiresIn });
}

const resolvers = {
    Query: {
        obtenerProyectos: async (_, { }, ctx) => {
            const proyectos = await Proyecto.find({ creador: ctx.id });
            return proyectos;
        },


        obtenerTareas: async (_, {input}, ctx) => {
            const tareas = await Tarea.find({creador: ctx.id}).where('proyecto').equals(input.proyecto);
            return tareas;
        }   
    },
    Mutation: {
        //Usuario 

        crearUsuario: async (_, { input }) => {
            const { email, password } = input;

            const existeUsuario = await Usuario.findOne({ email });

            //Usuario existe 
            if (existeUsuario) {
                throw new Error('El usuario ya esta registrado');

            }

            try {
                //Hashear password 
                const salt = await bcryptjs.genSalt(10);
                input.password = await bcryptjs.hash(password, salt);
                //Registrar nuevo usuario                
                const nuevoUsuario = new Usuario(input);

                nuevoUsuario.save();
                return "Usuario Creado Correctamente";
            } catch (error) {
                console.log(error);
            }
        },
        autenticarUsuario: async (_, { input }) => {
            const { email, password } = input;

            //Revisar si el usuario existe 
            const existeUsuario = await Usuario.findOne({ email });

            //Usuario existe 
            if (!existeUsuario) {
                throw new Error('El usuario no existe');

            }

            //Revisar si el password es correcto 
            const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password);
            if (!passwordCorrecto) {
                throw new Error('Contraseña incorrecta');
            }


            // dar Acceso a la app 
            return {
                token: crearToken(existeUsuario, process.env.SECRETA, '8hr')
            }
        }, //Auth

        //Proyecto
        nuevoProyecto: async (_, { input }, ctx) => {

            try {
                const proyecto = new Proyecto(input);
                //Relacionar el proyecto con el creador 
                proyecto.creador = ctx.id;
                //Almacenar 
                const resultado = await proyecto.save();
                return resultado;

            } catch (error) {
                console.log(error);
            }
        },

        actualizarProyecto: async (_, { id, input }, ctx) => {
            //Revisar si el proyecto existe 
            let proyecto = await Proyecto.findById(id);
            if (!proyecto) {
                throw new Error('Proyecto no encontrado');
            }
            //Revisar que la persona que trata de editarlo es el creador 
            if (proyecto.creador.toString() !== ctx.id) {
                throw new Error('No te Pertenece el proyecto');
            }
            //Guardar el proyecto
            proyecto = await Proyecto.findOneAndUpdate({ _id: id }, input, { new: true });
            return proyecto;
        },

        eliminarProyecto: async (_, { id }, ctx) => {
            //Revisar si el proyecto existe 
            let proyecto = await Proyecto.findById(id);
            if (!proyecto) {
                throw new Error('No existe el Proyecto');
            }


            //Evaluar si el usuario es el creador 
            if (proyecto.creador.toString() !== ctx.id) {
                throw new Error('No puedes Eliminar este proyecto');
            }

            //Eliminar
            await Proyecto.findByIdAndDelete({ _id: id });
            return "Proyecto Eliminado";

        },

        //Tareas 
        nuevaTarea: async (_, { input }, ctx) => {

            try {
                const tarea = new Tarea(input);
                tarea.creador = ctx.id;
                const resultado = tarea.save();
                return resultado;
            } catch (error) {
                console.log(error); console.log(resultado);
            }
        },

        actualizarTarea: async (_, {id, input, estado }, ctx) => {
            //Verificar si la tarea Existe 
            let tarea = await Tarea.findById(id);
            if(!tarea){
                throw new Error('La Tarea no Existe');
            }
            //Verificar si la persona es el propietario 
            if(tarea.creador.toString() !== ctx.id){
                throw new Error('No Puedes Eliminar esta Tarea ');
            }

            //asiganar estado 
           
            tarea.estado =estado;
            console.log(tarea);
            //Guardar y retorar tarea 
            tarea = await Tarea.findOneAndUpdate({_id: id}, {estado: estado}, {new :true});
            return tarea;


        },

        eliminarTarea:  async (_, {id}, ctx) => {
            //Verificar si la tarea Existe 
            let tarea = await Tarea.findById(id);
            if(!tarea){
                throw new Error('La Tarea no Existe');
            }
            //Verificar si la persona es el propietario 
            if(tarea.creador.toString() !== ctx.id){
                throw new Error('No Puedes Eliminar esta Tarea ');
            }

            //Eliminar 
            await Tarea.findOneAndDelete({_id:id});
            return "Tarea Eliminada";
        }
    }
}

module.exports = resolvers;