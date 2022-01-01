const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const { ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://rakib05:rakib01929@cluster0.gzsrh.mongodb.net/test
`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

async function run() {
    try {
        await client.connect();
        const database = client.db("hero-rider");
        const usersCollection = database.collection("users");
        const coursesCollection = database.collection("courses");
        const ordersCollection = database.collection("orders");

        // users post and get from database
        app.post("/users", async (req, res) => {
            const user = req.body;
            const newUser = await usersCollection.insertOne(user);
            res.json(newUser);
        }).get("/users", async (req, res) => {
            const cursor = usersCollection.find({});
            // page count
            const count = await cursor.count();
            const { pageIndex } = req.query;
            const size = parseInt(req.query.size);
            console.log(pageIndex, size);
            // // pagination limit
            let users;
            if (pageIndex) {
                users = await cursor
                    .skip(pageIndex * size)
                    .limit(size)
                    .toArray();
            } else {
                users = await cursor.toArray();
            }
            // console.log(users);

            // filtering out admin from user api
            const adminFilter = users.filter(
                (user) => user.email !== "admin@admin.com"
            );

            app.put("/users/admin", async (req, res) => {
                const user = req.body;
                console.log(user);
                const filter = { email: user.email };
                const updateDoc = { $set: { role: "admin" } };
                const result = await usersCollection.updateOne(
                    filter,
                    updateDoc
                );
                res.json(result);
            });

            // new product filtered
            let userFilter = [...adminFilter];
            console.log(userFilter);
            console.log(`---------`);

            const { email, phone, fullName, age } = req.query;
            // apply filters
            if (email) {
                userFilter = userFilter.filter((user) =>
                    user.email.includes(email)
                );
                console.log(userFilter);
            }
            if (phone) {
                userFilter = userFilter.filter((user) =>
                    user.phone.includes(phone)
                );
            }
            if (fullName) {
                userFilter = userFilter.filter((user) =>
                    user.fullName.includes(fullName)
                );
            }
            switch (age) {
                case "51":
                    userFilter = userFilter.filter(
                        (user) => parseInt(user.age) > 51
                    );
                    break;
                case "50":
                    userFilter = userFilter.filter(
                        (user) =>
                            parseInt(user.age) > 40 && parseInt(user.age) < 51
                    );
                    break;
                case "40":
                    userFilter = userFilter.filter(
                        (user) =>
                            parseInt(user.age) > 30 && parseInt(user.age) < 41
                    );
                    break;
                case "30":
                    userFilter = userFilter.filter(
                        (user) =>
                            parseInt(user.age) > 17 && parseInt(user.age) < 31
                    );
                    break;
                default:
                    break;
            }
            console.log(userFilter);
            res.send({ count, userFilter });
        });

        // find admin
        app.get("/users/:email", async (req, res) => {
            const { email } = req.params;
            const query = { email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === "admin") {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        });

        // get courses
        app.get("/courses", async (req, res) => {
            const cursor = coursesCollection.find({});
            const courses = await cursor.toArray();
            res.send(courses);
        });
        app.get("/courses/:id", async (req, res) => {
            const { id } = req.params;
            const query = { _id: ObjectId(id) };
            const result = await coursesCollection.findOne(query);
            res.send(result);
        });

        // Stripe
        app.post("/create-payment-intent", async (req, res) => {
            const paymentInfo = req.body;
            const amount = paymentInfo.price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount,
                currency: "usd",
                payment_method_types: ["card"],
            });
            res.json({
                clientSecret: paymentIntent.client_secret,
            });
        });

        // post order
        app.post("/orders", async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.json(result);
        });

        app.get("/orders", async (req, res) => {
            const { email } = req.query;
            const orders = await ordersCollection.find({}).toArray();
            if (email) {
                const myOrders = orders.filter(
                    (order) => order.email === email
                );
                res.send(myOrders);
            } else {
                res.send(orders);
            }
        });
    } finally {
        // await client.close();
    }
}

run();

app.get("/", (req, res) => {
    res.send("Initial server setup is done for Hero Rider");
});

app.listen(port, () => {
    console.log("Serer is running at: ", port);
});
