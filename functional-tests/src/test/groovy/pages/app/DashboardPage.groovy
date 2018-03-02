package pages.app

import pages.app.BaseAppPage

class DashboardPage extends BaseAppPage {
  static at = { pageTitle.text().equals("Dashboard") }
  static url = "/activities"
  static content = {
    pageTitle { $(".view-title-container h1") }

    AddNewProjectBtn { $(".actions").$("a").has("span", text:"Add New Project") }
  }
}
