---
layout: home
---

# Останні новини

{% for post in site.posts %}
  <h2><a href="{{ post.url }}">{{ post.title }}</a></h2>
  <p>{{ post.date | date: "%d.%m.%Y" }}</p>
  {{ post.excerpt }}
{% endfor %}
