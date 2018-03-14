package specs.app

import geb.spock.GebReportingSpec
import groovy.json.JsonSlurper
import groovy.io.FileType
import com.mongodb.util.JSON

import com.mongodb.MongoClient
import com.mongodb.DB
import com.mongodb.BasicDBObject
import com.mongodb.DBCollection
import com.mongodb.WriteConcern
import com.mongodb.DBCursor
import com.mongodb.DBObject

abstract class FixtureSpec extends GebReportingSpec {
  private static final String FIXTURES = "fixtures";
  static fixture_files = []

  protected setupFixtures () {
    fixture("insert");
  }

  def cleanupSpec() {
    fixture('remove');
  }

  def fixture(method) {
    def env = System.getenv()

    println( env['FUNCTIONAL_HOST'] ? "FUNCTIONAL_HOST: " + env['FUNCTIONAL_HOST'] : "FUNCTIONAL_HOST not set - using localhost")
    def _host = env['FUNCTIONAL_HOST'] ? env['FUNCTIONAL_HOST'] : 'localhost'
    println( env['MONGODB_FUNC_DATABASE'] ? "MONGODB_FUNC_DATABASE: " + env['MONGODB_FUNC_DATABASE'] : "MONGODB_FUNC_DATABASE not set - using mem-dev-func")
    def _database = env['MONGODB_FUNC_DATABASE'] ? env['MONGODB_FUNC_DATABASE'] : "mem-dev-func"

    def _port

    if( env['MONGODB_FUNC_PORT'] ) {
      if(env['MONGODB_FUNC_PORT'].isInteger()) {
        println('MONGODB_FUNC_PORT: ' + env['MONGODB_FUNC_PORT'])
        _port = env['MONGODB_FUNC_PORT'] as Integer
      }
      else {
        println("MONGODB_FUNC_PORT not an integer - using 27017")
        _port = 27017
      }
    }
    else {
      println("MONGODB_FUNC_PORT not set - using 27017")
      _port = 27017
    }


    def _mongoClient = new MongoClient(_host, _port)

    DB db = _mongoClient.getDB(_database)

    String cwd = System.getProperty("user.dir");
    String fixtures_full_path = [cwd, FIXTURES].join('/')
    def fixtures_dir = new File(fixtures_full_path)

    def files = []
    fixtures_dir.eachFileRecurse (FileType.FILES) {
      file -> files << file
    }

    def fixtures = []
    files.each {
      file -> if(file.name.endsWith('.json') && //its a json file and ...
                  ( fixture_files.contains(file.name) || fixture_files.contains(file.name.split("\\.")[0] ) ) ) {//the file name is included in the fixture list with or without the json extension
                fixtures << file
              }
    }

    def jsonSlurper = new JsonSlurper()

    fixtures.each {
      file -> def inputJson = jsonSlurper.parseText(file.text)
              def fixtureObjects = []
              inputJson.each{
                collection -> def collectionName = collection.collection
                              def collectionObjects = collection.objects
                              collectionObjects.each {
                                object -> DBCollection dbCollection = db.getCollection(collectionName)
                                          def keySet = object.keySet()
                                          BasicDBObject basicObject = new BasicDBObject()
                                          keySet.each {
                                            key -> basicObject.put(key, object[key])
                                          }
                                          dbCollection."$method"(basicObject, WriteConcern.SAFE)
                              }
              }
    }
  }
}
