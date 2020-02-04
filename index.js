const fs = require("fs");
const util = require("util");
const inquirer = require("inquirer");
const axios = require("axios");
const puppeteer = require("puppeteer");

const writeFileAsync = util.promisify(fs.writeFile);

// Prompt user for GitHub user name and favorite color. Only includes colors that will be dark enough for readability of white text.

function promptUser() {
  return inquirer.prompt([
    {
      type: "input",
      name: "username",
      message: "What is your GitHub username?"
    },
    {
      type: "list",
      name: "color",
      message: "What is your favorite color?",
      choices: [
        "Red",
        "Pink",
        "Purple",
        "Blue",
        "Navy",
        "Teal",
        "Green",
        "Orange",
        "Gold",
        "Brown",
        "Black"
      ]
    }
  ]);
}

// Prompt user when the entered GitHub user name can't be found

function retryPrompt() {
  return inquirer.prompt({
    type: "list",
    name: "answer",
    message: "I couldn't find data for that username on GitHub. Want to try again?",
    choices: [
      "Yes!",
      "No."
    ]
  });
}

// Handle null values in the GitHub data

function generateHeader(githubData) {
  const locationLink = githubData.data.location ? 
    `<a href="https://www.google.com/maps/place/${githubData.data.location}">
        ${githubData.data.location}
      </a>
    `:
    "";
  const blogLink = githubData.data.blog ?
    `<a href="${githubData.data.blog}">Blog</a>`:
    "";
  return `
    <header>
      <div class="container">
        <div class="row">
          <div class="col text-center user-color header-position">
            <img src="${githubData.data.avatar_url}" height="175" />
            <h1>${githubData.data.name}</h1>
            <p class="header-links d-flex justify-content-center flex-wrap">
              ${locationLink}
              <a href="${githubData.data.html_url}">GitHub Profile</a>
              ${blogLink}
            </p>
          </div>
        </div>
      </div>
    </header>
  `
}

// Set up HTML profile that data will be plugged into later
// populated with the following:
// Profile image
// User name
// Links to the following:
//   User location via Google Maps
//   User GitHub profile
//   User blog
// User bio
// Number of public repositories
// Number of followers
// Number of GitHub stars
// Number of users following

function profileHTML(userData, githubData, githubStarsData) {
  return `
 <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>${githubData.data.name}'s Profile</title>
    <!--Bootstrap-->
    <link
      rel="stylesheet"
      href="https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css"
      integrity="sha384-Vkoo8x4CGsO3+Hhxv8T/Q5PaXtkKtu6ug5TOeNV6gBiFeWPGFN9MuhOf23Q9Ifjh"
      crossorigin="anonymous"
    />
    <!--CSS-->
    <style>
      .user-color {
        background-color: ${userData.color};
      }
      body {
        background-color: #ddd;
        color: #fff;
      }

      h3 {
        color: #333;
      }

      .header-position {
        position: relative;
        top: 60px;
        border-radius: 3px;
        padding: 20px;
        padding-top: 0;
      }

      .header-position img {
        position: relative;
        top: -40px;
        border-radius: 50%;
        border: 9px solid #fff;
      }

      .header-links a,
      .header-links a:hover,
      .header-links a:active,
      .header-links a:visited {
        color: white;
        text-decoration: none;
        margin: 10px 25px;
        font-weight: 700;
      }

      section {
        background-color: #fff;
        padding: 85px 0 20px;
      }

      .data-card {
        margin: 30px;
        padding: 20px;
        border-radius: 3px;
      }
    </style>
  </head>
  <body>
    ${generateHeader(githubData)}
    <section>
      <div class="container">
        <div class="row">
          <div class="col text-center">
            <h3>${githubData.data.bio}</h3>
          </div>
        </div>
        <div class="row">
          <div class="col-sm-6">
            <div class="data-card user-color text-center">
              <h5>Public Repositories:</h5>
              <p>${githubData.data.public_repos}</p>
            </div>
          </div>
          <div class="col-sm-6">
            <div class="data-card user-color text-center">
              <h5>Followers:</h5>
              <p>${githubData.data.followers}</p>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-sm-6">
            <div class="data-card user-color text-center">
              <h5>GitHub Stars:</h5>
              <p>${githubStarsData.data.length}</p>
            </div>
          </div>
          <div class="col-sm-6">
            <div class="data-card user-color text-center">
              <h5>Following:</h5>
              <p>${githubData.data.following}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </body>
</html>
 `;
}

// Create profile using user data from inquirer and github API

async function init() {
  try {
    const userData = await promptUser();
    const githubData = await axios.get(
      `https://api.github.com/users/${userData.username}`
    );
    const githubStarsData = await axios.get(
      `https://api.github.com/users/${userData.username}/starred`
    );
    const html = profileHTML(userData, githubData, githubStarsData);

    // Create .html file

    await writeFileAsync(`profile_${userData.username}.html`, html);
    console.log(`Successfully wrote profile_${userData.username}.html`);

    // Create .pdf file

    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setContent(html);
    await page.emulateMediaFeatures("screen");
    await page.pdf({
      path: `profile_${userData.username}.pdf`,
      format: "A4",
      printBackground: true
    });

    console.log(`Successfully wrote profile_${userData.username}.pdf`);
    await browser.close();
    process.exit();
  } catch (err) {
    if (err.response.data.message === "Not Found") {
      const userResponse = await retryPrompt();
      if (userResponse.answer === "Yes!") {
        return init();
      }
    }
    // console.log(err);
  }
}

init();