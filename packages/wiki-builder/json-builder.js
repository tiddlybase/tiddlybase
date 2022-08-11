const getTiddlyWikiInfo = () => ({
    // TODO: get config, plugins and included wikis from tiddlybase config
    "description": "Empty tiddlybase edition",
    
    // include the original wiki when building a wiki.json file
    "includeWikis": [
		{"path": "../../../csaladi_naplo/headless", "read-only": true}
	],
    
    "config": {
        /*
        "default-storage-prefix": "csaladwiki/files",
        "display-link-icons": true
        */
    },
    "plugins": [
        /* comment out all plugins when building a wiki.json file 
        "tiddlywiki/codemirror",
        "tiddlybase/init",
        "tiddlybase/tiddlybase-utils",
        "tiddlybase/react",
        "tiddlybase/embed-media",
        "tiddlybase/mdx"
        */
    ],
    "themes": [
        "tiddlywiki/vanilla",
    ],
    "build": {
        "wiki.json": [
            "--savejson",
            "default-wiki.json"
        ]
    }
})

if (require.main === module) {
   console.log(JSON.stringify(getTiddlyWikiInfo(), null, 4))
}

module.exports = {getTiddlyWikiInfo};
