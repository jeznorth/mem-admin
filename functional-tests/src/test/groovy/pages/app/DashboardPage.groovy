package pages.app

import pages.app.BaseAppPage

class DashboardPage extends BaseAppPage {
  public static final def PROJECT_NAME = 0
  static at = { pageTitle.text().equals("Dashboard") }
  static url = "/activities"
  static content = {
    pageTitle { $(".view-title-container h1") }
    unpublishedProjectsTable { $("#unpublished-projects-table") }
    unpublishedProjectsTableTBody { $("#unpublished-projects-table tbody") }
    unpublishedProjectsTableFirstRowFirstColumn { $("#unpublished-projects-table tbody tr:first td:first") }

    AddNewProjectBtn { $(".actions").$("a").has("span", text:"Add New Project") }
  }

  def getRowCount() {
    return unpublishedProjectsTableTBody.children().size()
  }

  def getRowAtIndex( index ) {
    return unpublishedProjectsTableTBody.children()[index]
  }

  def getProjectName(row){
    return row.children().getAt(PROJECT_NAME)
  }
}
