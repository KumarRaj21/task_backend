const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const app = express();

const transSchema = new mongoose.Schema({
    id:Number,
    title: String,
    description: String,
    price: String,
    sold: Boolean,
    category: String,
    imgage:String,
    dateOfSale: Date
});

const Transaction = mongoose.model('Transaction', transSchema);

mongoose.connect('mongodb+srv://Konnakumar123:Konnakumar123@cluster0.2kzz1oj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
).then(()=>{
    console.log('db connected')
}).catch((err)=> console.log(err))
app.use(express.json());

app.get('/', (req,res)=>{
    res.send("hello")
})




// app.get('/getlist',async (req,res)=>{
//     try{
// const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
//         const transactions = response.data;
//         const data = new Transaction.insertMany(transactions)
//         res.send(data)
//     }catch(err){
//       res.send(err)
//     }
    
// })

app.get('/api/data', async (req, res) => {
    try {
        const response = await axios.get('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        const transactions = response.data;

        await Transaction.deleteMany({});
        await Transaction.insertMany(transactions);

        res.json({ message: 'Database initialized with seed data.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// // Helper function to filter data by month
const filterDataByMonth = (data, month) => {
    return data.filter(item => new Date(item.dateOfSale).getMonth() + 1 === parseInt(month));
};

// // API to list all transactions with search and pagination
app.get('/api/transactions', async (req, res) => {
    const { search = '', page = 1, perPage = 10 } = req.query;

    const query = {
        $or: [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { price: { $regex: search, $options: 'i' } }
        ]
    };

    try {
        const transactions = await Transaction.find(query)
            .skip((page - 1) * perPage)
            .limit(parseInt(perPage));
        
        const total = await Transaction.countDocuments(query);

        res.json({ transactions, total, page, perPage });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API for statistics
app.get('/api/statistics/:month', async (req, res) => {
    const month = req.params.month;

    try {
        const transactions = await Transaction.find();
        const filteredData = filterDataByMonth(transactions, month);

        const totalSaleAmount = filteredData.filter(item => item.sold).reduce((acc, item) => acc + item.price, 0);
        const totalSoldItems = filteredData.filter(item => item.sold).length;
        const totalNotSoldItems = filteredData.filter(item => !item.sold).length;

        res.json({ totalSaleAmount, totalSoldItems, totalNotSoldItems });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// // API for bar chart
app.get('/api/bar-chart/:month', async (req, res) => {
    const month = req.params.month;

    try {
        const transactions = await Transaction.find();
        const filteredData = filterDataByMonth(transactions, month);

        const priceRanges = {
            "0-100": 0,
            "101-200": 0,
            "201-300": 0,
            "301-400": 0,
            "401-500": 0,
            "501-600": 0,
            "601-700": 0,
            "701-800": 0,
            "801-900": 0,
            "901-above": 0
        };

        filteredData.forEach(item => {
            if (item.price <= 100) priceRanges["0-100"]++;
            else if (item.price <= 200) priceRanges["101-200"]++;
            else if (item.price <= 300) priceRanges["201-300"]++;
            else if (item.price <= 400) priceRanges["301-400"]++;
            else if (item.price <= 500) priceRanges["401-500"]++;
            else if (item.price <= 600) priceRanges["501-600"]++;
            else if (item.price <= 700) priceRanges["601-700"]++;
            else if (item.price <= 800) priceRanges["701-800"]++;
            else if (item.price <= 900) priceRanges["801-900"]++;
            else priceRanges["901-above"]++;
        });

        res.json(priceRanges);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// // API for pie chart
app.get('/api/pie-chart/:month', async (req, res) => {
    const month = req.params.month;

    try {
        const transactions = await Transaction.find();
        const filteredData = filterDataByMonth(transactions, month);

        const categoryCounts = {};

        filteredData.forEach(item => {
            if (!categoryCounts[item.category]) {
                categoryCounts[item.category] = 0;
            }
            categoryCounts[item.category]++;
        });

        res.json(categoryCounts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// // API to combine all responses
app.get('/api/combined/:month', async (req, res) => {
    const month = req.params.month;

    try {
        const statisticsResponse = await axios.get(`http://localhost:5000/api/statistics/${month}`);
        const barChartResponse = await axios.get(`http://localhost:5000/api/bar-chart/${month}`);
        const pieChartResponse = await axios.get(`http://localhost:5000/api/pie-chart/${month}`);

        res.json({
            statistics: statisticsResponse.data,
            barChart: barChartResponse.data,
            pieChart: pieChartResponse.data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.listen(5000, ()=> console.log('server running'))