let expenses = JSON.parse(localStorage.getItem("expenses")) || [];
let budget = Number(localStorage.getItem("budget")) || 0;

function get(id) {
    return document.getElementById(id);
}

let now = new Date();
let today = now.getFullYear() + "-" +
    String(now.getMonth() + 1).padStart(2, "0") + "-" +
    String(now.getDate()).padStart(2, "0");

get("date").value = today;
get("budget").value = budget || "";
get("monthLabel").textContent = now.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric"
});

function save() {
    localStorage.setItem("expenses", JSON.stringify(expenses));
    localStorage.setItem("budget", budget);
}

function showExpenses() {
    let search = get("search").value.toLowerCase();
    let category = get("filter").value;
    let sort = get("sort").value;

    let shown = expenses.filter(function(item) {
        return item.name.toLowerCase().includes(search) &&
            (!category || item.category === category);
    });

    if (sort === "new") {
        shown.sort((a, b) => b.date.localeCompare(a.date));
    }

    if (sort === "old") {
        shown.sort((a, b) => a.date.localeCompare(b.date));
    }

    if (sort === "high") {
        shown.sort((a, b) => b.amount - a.amount);
    }

    if (sort === "low") {
        shown.sort((a, b) => a.amount - b.amount);
    }

    get("rows").innerHTML = "";

    shown.forEach(function(item, index) {
        let row = document.createElement("tr");

        [index + 1, item.name, "₹" + item.amount.toFixed(2),
            item.category, item.date].forEach(function(value) {
            let cell = document.createElement("td");

            if (value === item.category) {
                let tag = document.createElement("span");
                tag.className = "pill";
                tag.textContent = value;
                cell.appendChild(tag);
            } else {
                cell.textContent = value;
            }

            row.appendChild(cell);
        });

        let cell = document.createElement("td");
        let button = document.createElement("button");

        button.textContent = "Delete";
        button.className = "delete";

        button.onclick = function() {
            expenses = expenses.filter(function(expense) {
                return expense.id !== item.id;
            });

            save();
            showExpenses();
        };

        cell.appendChild(button);
        row.appendChild(cell);
        get("rows").appendChild(row);
    });

    get("empty").hidden = shown.length > 0;

    let month = today.slice(0, 7);
    let current = expenses.filter(function(item) {
        return item.date.slice(0, 7) === month;
    });

    let total = current.reduce(function(sum, item) {
        return sum + item.amount;
    }, 0);

    get("spent").textContent = "₹" + total.toFixed(2);
    get("count").textContent = current.length;
    get("left").textContent = "₹" + (budget - total).toFixed(2);

    if (budget > 0 && total > budget) {
        get("warning").textContent = "Budget exceeded!";
    } else if (budget > 0) {
        get("warning").textContent = "Within your budget";
    } else {
        get("warning").textContent = "Set your budget below";
    }
}

get("form").onsubmit = function(event) {
    event.preventDefault();

    let name = get("name").value.trim();
    let amount = Number(get("amount").value);
    let category = get("category").value;
    let date = get("date").value;

    if (!name || amount <= 0 || !category || !date) {
        alert("Please enter valid expense details.");
        return;
    }

    expenses.push({
        id: Date.now(),
        name: name,
        amount: amount,
        category: category,
        date: date
    });

    save();
    get("form").reset();
    get("date").value = today;
    get("message").textContent = "Expense added successfully!";

    showExpenses();
};

get("budget").onchange = function() {
    budget = Math.max(0, Number(this.value) || 0);
    this.value = budget || "";
    save();
    showExpenses();
};

get("search").oninput = showExpenses;
get("filter").onchange = showExpenses;
get("sort").onchange = showExpenses;

get("reset").onclick = function() {
    get("search").value = "";
    get("filter").value = "";
    get("sort").value = "new";
    showExpenses();
};

get("clear").onclick = function() {
    if (confirm("Delete all expenses?")) {
        expenses = [];
        save();
        showExpenses();
    }
};

get("export").onclick = function() {
    let file = new Blob(
        [JSON.stringify(expenses, null, 2)],
        { type: "application/json" }
    );

    let link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = "expenses.json";
    link.click();
    URL.revokeObjectURL(link.href);
};

get("import").onchange = async function() {
    try {
        if (!this.files[0]) return;

        let data = JSON.parse(await this.files[0].text());

        if (!Array.isArray(data) || !data.every(function(item) {
            return item &&
                typeof item.name === "string" &&
                Number(item.amount) > 0 &&
                item.category &&
                /^\d{4}-\d{2}-\d{2}$/.test(item.date);
        })) {
            throw new Error("Invalid file");
        }

        if (confirm("Replace your current expenses with this file?")) {
            expenses = data.map(function(item) {
                return {
                    id: Date.now() + Math.random(),
                    name: item.name,
                    amount: Number(item.amount),
                    category: item.category,
                    date: item.date
                };
            });

            save();
            showExpenses();
        }
    } catch {
        alert("This is not a valid expense JSON file.");
    }

    this.value = "";
};

get("convert").onclick = async function() {
    get("usd").textContent = "Loading...";

    let month = today.slice(0, 7);
    let total = expenses.filter(function(item) {
        return item.date.slice(0, 7) === month;
    }).reduce(function(sum, item) {
        return sum + item.amount;
    }, 0);

    try {
        let response = await fetch(
            "https://open.er-api.com/v6/latest/INR"
        );
        let data = await response.json();

        if (!data.rates || !data.rates.USD) {
            throw new Error("Rate unavailable");
        }

        get("usd").textContent =
            "$" + (total * data.rates.USD).toFixed(2);
    } catch {
        get("usd").textContent = "Rate unavailable";
    }
};

showExpenses();