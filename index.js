const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
// const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(cors({
  origin: [
    'http://localhost:5173'
  ]
}));
// , 'https://learn-ease-ccdbe.web.app', 'https://learn-ease-ccdbe.firebaseapp.com'
app.use(express.json());


const uri = `mongodb+srv://${ process.env.DB_USER }:${ process.env.DB_PASS }@cluster0.wzcn8fz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
console.log(uri);
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {

    const userCollection = client.db('eduFusionDB').collection('users');
    const classCollection = client.db('eduFusionDB').collection('classes');
    const teacherRequestCollection = client.db('eduFusionDB').collection('teacherRequests');
    const enrollCollection = client.db("eduFusionDB").collection("enrollClasses");
    const assignmentCollection = client.db("eduFusionDB").collection("assignment");
    const rateCollection = client.db("eduFusionDB").collection("rating");
    
// user related api
 // jwt related api
 app.post("/jwt", async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" });
  res.send({ token });
});
// jwt middleware
const verifyToken = (req, res, next) => {
  // console.log('inside verify token',req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "forbidden access" });
  }
  const token = req.headers.authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      res.status(401).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
};

const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  const isAdmin = user?.role === "admin";
  if (!isAdmin) {
    res.status(403).send({ message: "forbidden access" });
  }
  next();
};
// jwt middleware
// jwt related api

// database api start

// payment related api
// app.post('/create-payment-intent', async(req, res) => {
//   const {price} = req.body;
//   const amount = parseInt(price * 100);
//   console.log('amount inside the intent', amount)

//   const paymentIntent = await stripe.paymentIntents.create({
//     amount: amount,
//     currency: 'usd',
//     payment_method_types: ['card']
//   });

//   res.send({
//     clientSecret: paymentIntent.client_secret
//   });
// });
// payment related api

// user related api

app.get("/users/admin/:email", verifyToken, async (req, res) => {
  const email = req.params.email;
  // console.log('from admin',email);
  if (email !== req.decoded.email) {
    return res.status(403).send({ message: "unauthorized access" });
  }
  const query = { email: email };
  const user = await userCollection.findOne(query);
  let admin = false;
  if (user) {
    admin = user?.role === "admin";
  }
  res.send({ admin });
});

app.get("/users/teacher/:email", verifyToken, async (req, res) => {
  const email = req.params.email;
  // console.log('from teacher',email);
  if (email !== req.decoded.email) {
    return res.status(403).send({ message: "unauthorized access" });
  }
  const query = { email: email };
  const user = await userCollection.findOne(query);
  let teacher = false;
  if (user) {
    teacher = user?.role === "teacher";
  }
  res.send({ teacher });
});

app.post("/users", async (req, res) => {
  const userInfo = req.body;
  const query = { email: userInfo.email };
  const existingUser = await userCollection.findOne(query);
  if (existingUser) {
    return res.send({ message: "user already exist", insertedId: null });
  }
  const result = await userCollection.insertOne(userInfo);
  res.send(result);
});

app.get("/profile/:email", async (req, res) => {
  const email = req.params.email;
  // console.log(email)
  const query = { email: email };
  const result = await userCollection.findOne(query);
  res.send(result);
});

// user related api

// admin api
app.get("/class",verifyToken, verifyAdmin, async (req, res) => {
  const result = await classCollection.find().toArray();
  res.send(result);
});

app.get("/alluser", verifyToken, verifyAdmin, async (req, res) => {
  const result = await userCollection.find().toArray();
  res.send(result);
});

app.get("/request",verifyToken, verifyAdmin, async (req, res) => {
  const result = await teacherCollection.find().toArray();
  res.send(result);
});

// app.get("/search/:text", verifyToken, verifyAdmin, async(req, res) => {
//   const searchText = req.params.text;
//   // console.log(info)
//   if(searchText){
//     query.name = { $regex: searchText, $option: "i"};
//   }
//   const result = await userCollection.find(query).toArray();
//   res.send(result);
// });

app.patch("/user/admin/:id",verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  console.log(id);
  const filter = { _id: new ObjectId(id) };
  const updatedRole = {
    $set: {
      role: "admin",
    },
  };
  const result = await userCollection.updateOne(filter, updatedRole);
  res.send(result);
});

app.patch("/classtatus/:id",verifyToken, verifyAdmin, async (req, res) => {
  const item = req.body;
  const id = req.params.id;
  const updateStatus = {
    $set: {
      status: item.status,
    },
  };
  const filter = { _id: new ObjectId(id) };
  const result = await classCollection.updateOne(filter, updateStatus);
  res.send(result);
});

app.patch("/teacherrequ/:email",verifyToken, verifyAdmin, async (req, res) => {
  const email = req.params.email;
  const info = req.body;
  console.log("bum bum", info);
  const filter = { email: email };
  const status = {
    $set: {
      status: req.body.status,
    },
  };
  const role = {
    $set: {
      role: req.body.role,
    },
  };

  const statusResult = await teacherCollection.updateOne(filter, status);
  const roleResult = await userCollection.updateOne(filter, role);
  res.send({ statusResult, roleResult });
});
// admin api

// teacher api
app.get("/class/:email",verifyToken, async (req, res) => {
  const email = req.params.email;
  const query = { email: email };
  const result = await classCollection.find(query).toArray();
  res.send(result);
});

app.get("/updateclass/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  // console.log("updated id",id)
  const query = { _id: new ObjectId(id) };
  const result = await classCollection.findOne(query);
  res.send(result);
});

app.get("/teaclassdetails/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  // console.log("tut tut", id);
  const query = { _id: new ObjectId(id) };
  const result = await classCollection.findOne(query);
  res.send(result);
});

app.patch("/updateclass/:id",verifyToken, async (req, res) => {
  const item = req.body;
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedClass = {
    $set: {
      title: item.title,
      image: item.image,
      price: item.price,
      shortDes: item.shortDes,
      description: item.description,
    },
  };
  const result = await classCollection.updateOne(filter, updatedClass);
  res.send(result);
});

app.post("/assignment",verifyToken, async (req, res) => {
  const info = req.body;
  const classId = info.classId;
  const totalAssignment = info.assignmentCount;
  const filter = { _id: new ObjectId(classId) };
  const updateInfo = {
    $set: {
      totalAssignment: totalAssignment,
    },
  };
  const assignResult = await assignmentCollection.insertOne(info);
  const totalAssignResult = await classCollection.updateOne(filter, updateInfo);
  res.send({ assignResult, totalAssignResult });
});

app.post("/class", verifyToken, async (req, res) => {
  const classInfo = req.body;
  console.log(classInfo);
  const result = await classCollection.insertOne(classInfo);
  res.send(result);
});

app.delete("/class/:id", verifyToken, async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await classCollection.deleteOne(query);
  res.send(result);
});
// teacher api

app.get("/teacher/:email", async (req, res) => {
  const email = req.params.email;
  const query = { email: email };
  const result = await teacherCollection.findOne(query);
  res.send(result);
});

app.post("/teacher", verifyToken, async (req, res) => {
  const info = req.body;
  const result = await teacherCollection.insertOne(info);
  res.send(result);
});

app.delete("/teacher/:email",verifyToken, async (req, res) => {
  const email = req.params.email;
  const query = { email: email };
  const result = await teacherCollection.deleteOne(query);
  res.send(result);
});

app.get("/allclasses", async (req, res) => {
  const info = "approved";
  const query = { status: info };
  const result = await classCollection.find(query).toArray();
  res.send(result);
});

app.get("/classdetails/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await classCollection.findOne(query);
  res.send(result);
});

app.get("/highlighted", async (req, res) => {
  const result = await classCollection.find().limit(10).sort({ totalEnroll: -1 }).toArray();
  res.send(result);
});

app.post("/enroll", async (req, res) => {
  const info = req.body;
  const enroll = req.body.enroll;
  const classId = req.body.classId;
  const updatedEnroll = {
    $set: {
      totalEnroll: enroll,
    },
  };
  const filter = { _id: new ObjectId(classId) };
  const enrollResult = await enrollCollection.insertOne(info);
  const countResult = await classCollection.updateOne(filter, updatedEnroll);
  res.send({ enrollResult, countResult });
});

app.get("/enroll/:email",verifyToken, async (req, res) => {
  const email = req.params.email;
  const query = { userEmail: email };
  const result = await enrollCollection.find(query).toArray();
  res.send(result);
});

app.get("/enrollClass/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await enrollCollection.findOne(query);
  res.send(result);
});

app.get("/assignment/:id",verifyToken, async (req, res) => {
  const id = req.params.id;
  // console.log("kula kula", id)
  const query = { classId: id };
  const result = await assignmentCollection.find(query).toArray();
  res.send(result);
});

app.get("/upclass/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await classCollection.findOne(query);
  res.send(result);
});

app.patch("/updateSubmit/:id",verifyToken, async (req, res) => {
  const id = req.params.id;
  const info = req.body;
  const query = {_id: new ObjectId(id)};
  const filter = { _id: new ObjectId(info.classId) };
  updatedDoc = {
    $set: {
      assignmentSubmitted: info.updated
    },
  };
  updated = {
    $set:{
      totalSumbit : info.updated
    }
  }
  const assignResult = await assignmentCollection.updateOne(query, updatedDoc);
  const classResult = await classCollection.updateOne(filter, updated)
  res.send({assignResult, classResult})
});

app.post("/rate", verifyToken, async (req, res) => {
  const info = req.body;
  const result = await rateCollection.insertOne(info);
  res.send(result);
});

app.get("/rate", async(req, res) => {
  const result = await rateCollection.find().toArray();
  res.send(result);
});

app.get("/rate/:id",verifyToken, async(req, res) => {
  const id = req.params.id;
  const query = {classId: id};
  const result = await rateCollection.find(query).toArray();
  res.send(result);
});

app.get("/publicuser", async(req, res) => {
  const query = {status: "approved"}
  const userResult = await userCollection.find().toArray();
  const classResult = await classCollection.find(query).toArray();
  const enrollResult = await enrollCollection.find().toArray();
  res.send({userResult, classResult, enrollResult});
});

   
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('EduFusion server is running')
})

app.listen(port, () => {
    console.log(
        `EduFusion server is running on port ${ port }`,
    )
})