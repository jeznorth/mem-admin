package pages.app

import pages.app.BaseAppPage

class AddEditRecentNewsPage extends BaseAppPage {
  static at = { pageTitle.text().startsWith("Add/Edit Recent News") }
  static url = "/admin/recentactivity/create"
  static content = {
    pageTitle { $(".view-title-container h1") }

    CancelBtn { $(".actions").$("button", text:"Cancel") }
    SaveBtn { $(".actions").$("button", text:"Save") }
  }
}
