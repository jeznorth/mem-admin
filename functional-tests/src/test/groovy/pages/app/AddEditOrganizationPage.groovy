package pages.app

import pages.app.BaseAppPage

class AddEditOrganizationPage extends BaseAppPage {
  static at = { pageTitle.text().startsWith("Add/Edit Organization") }
  static url = "/admin/organization/create"
  static content = {
    pageTitle { $(".view-title-container h1") }

    CancelBtn { $(".modal-footer").$("button", text:"Cancel") }
    SaveBtn { $(".modal-footer").$("button", text:"Save") }

    HeaderCancelBtn { $(".view-title-container .actions").$("button", text:"Cancel") }
    HeaderDeleteBtn { $(".view-title-container .actions").$("button").has("span", text:"Delete") }
    HeaderSaveBtn { $(".view-title-container .actions").$("button", text:"Save") }

    FooterCancelBtn { $(".form-footer").$("button", text:"Cancel") }
    FooterDeleteBtn { $(".form-footer").$("button").has("span", text:"Delete") }
    FooterSaveBtn { $(".form-footer").$("button", text:"Save") }
  }
}
