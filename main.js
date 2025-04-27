(function() {
  return {
    events: {
      'app.activated': 'onAppActivated'
    },

    onAppActivated: function() {
      var client = this.client;

      Promise.all([
        client.get('ticket.subject'),
        client.get('ticket.description')
      ]).then(function(results) {
        var subject = results[0]['ticket.subject'] || '';
        var description = results[1]['ticket.description'] || '';
        var text = (subject + ' ' + description).toLowerCase();

        var priority = 'Normal'; // Default

        if (text.includes('urgent') || text.includes('immediately') || text.includes('asap')) {
          priority = 'Urgent';
        } else if (text.includes('error') || text.includes('problem') || text.includes('issue')) {
          priority = 'High';
        } else if (text.includes('question') || text.includes('help')) {
          priority = 'Normal';
        } else {
          priority = 'Low';
        }

        client.invoke('resize', { width: '100%', height: '150px' });
        document.getElementById('priority-suggestion').innerText = `Suggested Priority: ${priority}`;
      });
    }
  };
})();
