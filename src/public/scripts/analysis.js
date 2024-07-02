let revenueChart;
let storeChart;
let productChart;
const locale = getCookie('locale');
function renderRevenueAnalysisChart(chartData) {
  const labels = chartData.map(data => data.time);
  const totals = chartData.map(data => parseFloat(data.total));

  const ctx = document.getElementById('revenueChart').getContext('2d');

  // Destroy the existing chart instance if it exists
  if (revenueChart) {
    revenueChart.destroy();
  }

  // Create a new chart instance
  revenueChart = new Chart(ctx, {
    type: 'bar', // Changed to 'bar' for a column chart
    data: {
      labels: labels,
      datasets: [{
        label: locale === 'en' ? 'Revenue' : 'Doanh thu',
        data: totals,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function renderStoreAnalysisChart(chartData) {
  const labels = chartData.map(data => data.name);
  const totals = chartData.map(data => parseFloat(data.total));

  const ctx = document.getElementById('storeRevenueChart').getContext('2d');

  // Destroy the existing chart instance if it exists
  if (storeChart) {
    storeChart.destroy();
  }

  // Create a new chart instance
  storeChart = new Chart(ctx, {
    type: 'bar', // Changed to 'bar' for a column chart
    data: {
      labels: labels,
      datasets: [{
        label: locale === 'en' ? 'Revenue by store' : 'Doanh thu theo cửa hàng',
        data: totals,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function renderProductAnalysisChart(chartData) {
  const labels = chartData.map(data => data.name);
  const totals = chartData.map(data => parseFloat(data.sellNumber));

  const ctx = document.getElementById('productAnalysisChart').getContext('2d');

  // Destroy the existing chart instance if it exists
  if (productChart) {
    productChart.destroy();
  }

  // Create a new chart instance
  productChart = new Chart(ctx, {
    type: 'bar', // Changed to 'bar' for a column chart
    data: {
      labels: labels,
      datasets: [{
        label: locale === 'en' ? 'Sell number' : 'Số lượng bán',
        data: totals,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

$(document).ready(function () {
  const chartData = JSON.parse($('#revenue-analysis-data').val());
  renderRevenueAnalysisChart(chartData)
  const storeChartData = JSON.parse($('#store-revenue-analysis-data').val());
  renderStoreAnalysisChart(storeChartData)
  const productChartData = JSON.parse($('#product-analysis-data').val());
  renderProductAnalysisChart(productChartData)
});

document.getElementById('revenue-analysis-form').addEventListener('submit', async function (event) {
  event.preventDefault();

  // Clear previous error messages
  document.getElementById('revenue-analysis-startDate-error').textContent = '';
  document.getElementById('revenue-analysis-endDate-error').textContent = '';
  document.getElementById('revenue-analysis-interval-error').textContent = '';
  document.getElementById('revenue-analysis-storeId-error').textContent = '';

  let data = {
    interval: document.getElementById('revenue-analysis-interval').value,
  };
  
  const startDate = document.getElementById('revenue-analysis-startDate').value;
  const endDate = document.getElementById('revenue-analysis-endDate').value;
  const storeId = document.getElementById('revenue-analysis-storeId').value

  if(startDate) data.startDate = startDate;
  if(endDate) data.endDate = endDate;
  if(storeId) data.storeId = storeId;

  const params = new URLSearchParams(data);

  const response = await fetch(`/admin/analysis/revenue?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    if (errorData.errors) {
      for (const [key, value] of Object.entries(errorData.errors)) {
        document.getElementById(`revenue-analysis-${key}-error`).textContent = value[0];
      }
    } else {
      throw new Error('Network response was not ok');
    }
  } else {
    const data = await response.json();
    renderRevenueAnalysisChart(data.chartData);
  }
});

document.getElementById('store-revenue-analysis-form').addEventListener('submit', async function (event) {
  event.preventDefault();

  // Clear previous error messages
  document.getElementById('store-revenue-analysis-startDate-error').textContent = '';
  document.getElementById('store-revenue-analysis-endDate-error').textContent = '';

  let data = {};
  
  const startDate = document.getElementById('store-revenue-analysis-startDate').value;
  const endDate = document.getElementById('store-revenue-analysis-endDate').value;

  if(startDate) data.startDate = startDate;
  if(endDate) data.endDate = endDate;

  const params = new URLSearchParams(data);

  const response = await fetch(`/admin/analysis/store-revenue?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    if (errorData.errors) {
      for (const [key, value] of Object.entries(errorData.errors)) {
        document.getElementById(`store-revenue-analysis-${key}-error`).textContent = value[0];
      }
    } else {
      throw new Error('Network response was not ok');
    }
  } else {
    const data = await response.json();
    renderStoreAnalysisChart(data.chartData);
  }
});

document.getElementById('product-analysis-form').addEventListener('submit', async function (event) {
  event.preventDefault();

  // Clear previous error messages
  document.getElementById('product-analysis-startDate-error').textContent = '';
  document.getElementById('product-analysis-endDate-error').textContent = '';
  document.getElementById('product-analysis-storeId-error').textContent = '';
  document.getElementById('product-analysis-categoryId-error').textContent = '';

  let data = {};
  
  const startDate = document.getElementById('product-analysis-startDate').value;
  const endDate = document.getElementById('product-analysis-endDate').value;
  const storeId = document.getElementById('product-analysis-storeId').value;
  const categoryId = document.getElementById('product-analysis-categoryId').value;

  if(startDate) data.startDate = startDate;
  if(endDate) data.endDate = endDate;
  if(storeId) data.storeId = storeId;
  if(categoryId) data.categoryId = categoryId;

  const params = new URLSearchParams(data);

  const response = await fetch(`/admin/analysis/product?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    if (errorData.errors) {
      for (const [key, value] of Object.entries(errorData.errors)) {
        document.getElementById(`product-analysis-${key}-error`).textContent = value[0];
      }
    } else {
      throw new Error('Network response was not ok');
    }
  } else {
    const data = await response.json();
    renderProductAnalysisChart(data.chartData);
  }
});
