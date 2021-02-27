#!/usr/bin/env node
const axios = require('axios');
const fs = require('fs');
const config = require('./config.json');
const LATEST_COUNT = 10;
const TOP_ISSUES_LABELS = '置顶';
const ANCHOR_NUMBER = 5;
const TOKEN = process.argv.slice(2)[0];

async function getIssues(params) {
  const { data } = await axios.get(`${config.api}/issues?token=${TOKEN}`, {
    params,
  });
  return data;
}

async function getLabels() {
  const { data } = await axios.get(`${config.api}/labels?token=${TOKEN}`);
  return data;
}

// 返回置顶 Issues
function getTopIssues() {
  return getIssues({ labels: TOP_ISSUES_LABELS });
}

// 返回最近修改的 10 条
function getLatestIssues() {
  return getIssues({ per_page: LATEST_COUNT, sort: 'updated' });
}

// 添加 readme item
function addIssueItemInfo(issue) {
  const time = String(issue['updated_at']).substring(0, 10);
  return `- [${issue.title}](${issue['html_url']})--${time}\n`;
}

// 添加一个板块
function addPartIssueInfo(title, issues) {
  let partMD = `
## ${title}\n`;
  issues.forEach(issue => {
    partMD += addIssueItemInfo(issue);
  });
  return partMD;
}

function isEmpty(arr) {
  return arr.length === 0;
}

async function updateReadme() {
  const labels = await getLabels();
  const latestIssues = await getLatestIssues();
  const topIssues = await getTopIssues();
  let readme = `
# 招聘信息  
汇总互联网行业相关求职信息，由已毕业的学长/学姐发布，信息真实可靠。

## 如何发布

打开一个 [Issue](https://github.com/HUSTLab/job/issues/new?assignees=&labels=&template=------.md&title=%E6%A0%87%E9%A2%98%E6%A8%A1%E7%89%88%EF%BC%9A%E9%98%BF%E9%87%8C%E5%B7%B4%E5%B7%B4-%E5%89%8D%E5%90%8E%E7%AB%AF-%E6%9D%AD%E5%B7%9E-%E5%85%B6%E4%BB%96%E4%BF%A1%E6%81%AF)，按照 Issues 模版填写相关的招聘信息，并选择一个标签，提交后会自动更新 Readme。

  `;
  if (!isEmpty(topIssues)) {
    // 添加置顶信息
    readme += addPartIssueInfo('置顶信息', topIssues);
  }
  if (!isEmpty(latestIssues)) {
    // 添加最近更新
    readme += addPartIssueInfo('近期更新', latestIssues);
  }

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    if (label['name'] === TOP_ISSUES_LABELS) {
      continue;
    }
    let partMD = `## ${label.name}\n`;
    const issuesWithLabel = await getIssues({ labels: label['name'] });
    if (isEmpty(issuesWithLabel)) {
      continue;
    }
    issuesWithLabel.forEach(issue => {
      if (i === ANCHOR_NUMBER) {
        partMD += '<details><summary>显示更多</summary>\n';
        partMD += '\n';
      }
      partMD += addIssueItemInfo(issue);
      if (i > ANCHOR_NUMBER) {
        partMD += '</detail>\n';
        partMD += '\n';
      }
    });
    readme += partMD;
  }
  fs.writeFileSync('./README.md', readme, 'utf8');
}

updateReadme();
