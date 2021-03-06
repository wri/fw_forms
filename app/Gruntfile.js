module.exports = grunt => {
  grunt.file.setBase("..");
  require("load-grunt-tasks")(grunt);

  grunt.initConfig({
    clean: {},

    express: {
      dev: {
        options: {
          script: "app/index.js"
        }
      }
    },

    mochaTest: {
      e2e: {
        options: {
          reporter: "spec",
          quiet: false,
          timeout: 10000,
          clearRequireCache: true // Optionally clear the require cache before running tests (defaults to false)
        },
        src: ["app/test/e2e/**/*.spec.js"]
      }
    },
    watch: {
      options: {
        livereload: false
      },
      jssrc: {
        files: ["app/src/**/*.js"],
        tasks: ["express:dev"],
        options: {
          spawn: false
        }
      },
      e2eTest: {
        files: ["app/test/e2e/**/*.spec.js"],
        tasks: ["mochaTest:e2e"],
        options: {
          spawn: false
        }
      }
    },

    nyc: {
      cover: {
        options: {
          include: ["app/src/**"],
          exclude: "*.test.*",
          reporter: ["lcov", "text-summary"],
          reportDir: "coverage",
          all: true
        },
        cmd: false,
        args: ["grunt", "--gruntfile", "app/Gruntfile.js", "mochaTest:e2e"]
      }
    }
  });

  grunt.registerTask("e2eTest", ["mochaTest:e2e"]);

  grunt.registerTask("serve", ["express:dev", "watch"]);

  grunt.registerTask("default", "serve");

  grunt.loadNpmTasks("grunt-simple-nyc");
};
