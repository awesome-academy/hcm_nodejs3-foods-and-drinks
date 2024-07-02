const locale = getCookie('locale');
document.addEventListener('DOMContentLoaded', async () => {
  // Helper function to create a chart
  const createChart = (chartElementId, dataElementId, chartLabel) => {
    const hiddenInput = document.getElementById(dataElementId).value;
    const data = JSON.parse(hiddenInput);

    const chartData = {
      labels: data.map(item => item.status || item.paymentStatus || item.name),
      data: data.map(item => item.number || item.sellNumber),
    };

    // Calculate total and percentages
    const total = chartData.data.reduce((acc, value) => acc + parseInt(value), 0);
    const percentages = chartData.data.map(value => ((parseInt(value) / total) * 100).toFixed(2));

    const chartElement = document.getElementById(chartElementId);
    const ul = chartElement.closest('.card').querySelector('ul');

    new Chart(chartElement, {
      type: "doughnut",
      data: {
        labels: chartData.labels,
        datasets: [
          {
            label: chartLabel,
            data: chartData.data,
          },
        ],
      },
      options: {
        borderWidth: 10,
        borderRadius: 2,
        hoverBorderWidth: 0,
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });

    const populateUl = () => {
      chartData.labels.forEach((label, i) => {
        let li = document.createElement("li");
        li.innerHTML = `${label}: <span class='percentage'>${percentages[i]}%</span>`;
        ul.appendChild(li);
      });
    };

    populateUl();
  };

  // Order by status chart
  createChart('order-by-status-chart', 'order-by-status-data', locale === 'en'? 'Number of orders' : 'Số đơn hàng');

  // Order by payment status chart
  createChart('order-by-payment-status-chart', 'order-by-payment-status-data', locale === 'en'? 'Number of orders' : 'Số đơn hàng');

  // Top five product chart
  createChart('top-product-chart', 'top-product-data', locale === 'en'? 'Sell number' : 'Số lượt bán');

  // Order by store chart
  createChart('order-by-store-chart', 'order-by-store-data', locale === 'en'? 'Number of orders' : 'Số đơn hàng');
});
