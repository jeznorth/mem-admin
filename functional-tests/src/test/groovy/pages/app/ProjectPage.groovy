package pages.app

import pages.app.base.BaseAppPage

class ProjectPage extends BaseAppPage {
  static at = { $("#project-details-header").text().equals("Project Details") }
  static url = "/p"
  static content = {
    projectName { $("#project-name")}
    documentsLink { $("#Documents")}
  }
}
