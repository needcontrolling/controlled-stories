// The file which can be entirely copy-and-pasted into Chrome's devTools console and executed from https://metalbondnyc.com to get the stories read and displayed

var $ = jQuery,
	bootstrapped = false,
	stories = [],
	clearCachedStories,
	storyStorage,
	storageReservationInMB = 25,
	saveStoriesToFs,
	isDim = false,
	preAuthorScrollPosition = 0,
	preStoryScrollPosition = 0,
	updateCacheWithUpdates = function()
	{
		storyStorage.root.getFile('stories.json', {}, saveStoriesToFs);
	}, updateTitle = function(title, href)
	{
		if (href !== undefined)
			title = "<a href='" + href + "' target='_blank'>" + title + "</a>";
		$(".entry-title").html(title);
	}, updateAuthor = function(author)
	{
		$(".author>a").text(author);
	}, updateDate = function(timestamp)
	{
		if (timestamp.length || timestamp > 0)
		{
			var fDate = new Date(timestamp);
			fDate = fDate.toLocaleDateString("en-IL", { year: 'numeric', month: 'long', day: 'numeric' });
		}
		else
			fDate = timestamp;
		
		$("time.entry-date").text(fDate);
	}, scrollTo= function(position)
	{
		$('html, body').animate(
		{
			scrollTop: position
		}, 1000);
	}, scrollToTitle = function()
	{
		scrollTo($("#primary .entry-title").first().offset().top);
	}, dim = function()
	{
		if (!isDim)
		{
			isDim = true;
			$("#content-sidebar,#secondary").fadeTo(1000, 0.2);
		}
	}, undim = function()
	{
		if (isDim)
		{
			isDim = false;
			$("#content-sidebar,#secondary").fadeTo(1000, 1);
		}
	}, showStory = function($scope, content)
	{
		$scope.storyContent = content;
		$("#storyContent").fadeIn(1000);
	}, hideStory = function($scope)
	{
		$("#storyContent").fadeOut(1000);
		setTimeout(function() { $scope.storyContent = ""; $scope.$apply(); }, 1000);
	}, phase1 = function()  // fetch and process all the stories, deal with the cache, and get everything ready to use
	{
		var flatStories = [], storiesGathered = 0, sani$ = function(str)
		{
			return $(str.replace(/<img[^>]*>/g,""));
		}, tFlatStory = function(url, title, author)
		{
			this.url = "";
			this.title = "";
			this.author = "";
			if (typeof title != "undefined")
				this.title=title;
			if (typeof url != "undefined")
				this.url=url;
			if (typeof author != "undefined")
				this.author=author;
		}, tStory = function(name, author)
		{
			this.name = "";
			this.sortName = "";
			this.author = "";
			if (typeof name != "undefined")
			{
				this.name = name;
				var m = this.name.match(/^(The )?(.*)$/i);  // strip "the"'s off the beginning of titles for the sake of sorting
				this.sortName = m?m[2]:this.name;  // if this function is called and *somehow* there is no match, then don't throw an error
			}
			if (typeof author != "undefined")
				this.author = author;
			
			this.parts = 0;
			this.lastUpdated = 0;  // when the story was last added to
			this.cachedOn = Date.now();  // when this story was cached; if cachedOn<lastUpdated, then we can flag the story as updated, if desired
			this.chapters = [];
		}, fetchStory = function(url, id)
		{
			$.get({url:url, id:id, success:function(data)
			{
				d = sani$(data);
				flatStories[this.id].author = d.find("header.entry-header .author").text();
				if (flatStories[this.id].author == "Featured Authors")  // Try to get the actual author name
				{
					var actualAuthor = d.find(".entry-content p").first().text().match(/^by (.*)$/i);
					if (actualAuthor != null)
						flatStories[this.id].author = actualAuthor[1];
				}
				
				flatStories[this.id].content = d.find(".entry-content").html();
				flatStories[this.id].datePosted = Date.parse(d.find("time.entry-date").attr("datetime"));
				storiesGathered++;
				if (progressReporting)
					progress();
			}}).fail(function()
			{
				console.log("Failed to fetch story from URL ", url, " so we'll try again.");
				fetchStory(url, id);
			});
		}, progress = function()
		{
			var prog,
				timeEstimate = "",
				perc = storiesGathered / flatStories.length * 100;
			
			if (perc > 99 && storiesGathered < flatStories.length)
				perc = 99;
			
			if ((prog = storiesGathered - progressStartedAt.storiesGathered) > 25)
			{
				if (storiesGathered != flatStories.length)
				{
					var remain = flatStories.length - storiesGathered,
						secondsPassed = (Date.now() - progressStartedAt.time) / 1000,
						rate = secondsPassed / prog,
						minutesRemaining = parseInt(((rate * remain) / 60).toLocaleString('en-US', {maximumFractionDigits: 0}));
					
					if (minutesRemaining >= 1)
						timeEstimate = " - about " + minutesRemaining + " minute" + (minutesRemaining==1?"":"s") + " left";
					else
						timeEstimate = " - less than a minute left"
				}
				else
					timeEstimate = " - done";
			}
			else
			{
				timeEstimate = " - estimating time remaining..."
			}
			console.info(perc.toLocaleString('en-US', {maximumFractionDigits: 0}) + "% - " + storiesGathered + " of " + flatStories.length + " chapters" + timeEstimate);
		}, progressReporting = true, progressStartedAt, progressReport = function()
		{
			if (progressReporting)
			{
				progress();
				setTimeout(progressReport, 30000);
			}
		}, commonTitleRegex = " (?:\\W )?((Part|Chapter)s? (\\d+)( ?(to|and|\\W) ?\\d+)?:?[a-z0-9\\-–'’\" \\(\\)]*)$",
		hasChapters = function(title)
		{
			return title.match(new RegExp(commonTitleRegex, "i")) !== null;
		}, stripName = function(title)
		{
			return title.match(new RegExp("^(.*?)" + commonTitleRegex, "i"))[1];
		}, gatherChapters = function(storyIndex, title)
		{
			var ts = new RegExp("^" + stripName(title) + commonTitleRegex, "i"),
				story = stories[storyIndex];
			$.each(flatStories, function(i, fStory)
			{
				var m = fStory.title.match(ts);
				
				// this chapter matches the title argument for gatherChapters, and it hasn't already been added to the story somewhere else
				if (m !== null && !findStoryPart(fStory.title))
				{
					var chapter =
						{
							title: m[1],
							number: parseInt(m[3]),  // this will sometimes be the first number of two (when the chapter title is something like "Parts 3 to 5"), but will at least serve the purpose of sorting
							url: fStory.url,
							datePosted: fStory.datePosted,
							content: fStory.content,
							readerData:
							{
								readOn: undefined
							}
						};
					story.chapters.push(chapter);
					
					story.parts++;
					if (story.lastUpdated < fStory.datePosted)
						story.lastUpdated = fStory.datePosted;
				}
			});
		}, getName = function(title)
		{
			return hasChapters(title) ? stripName(title) : title;
		}, storyExists = function(title)
		{
			for (var i=0; i<stories.length; i++)
			{
				if (stories[i].name == getName(title))
					return i;
			}
			
			return -1;
		}, findStoryPart = function(title)
		{
			var storyIndex = storyExists(title);
			if (storyIndex >= 0)
			{
				if (hasChapters(title))
				{
					var partTitle = title.match(new RegExp(commonTitleRegex, "i"))[1];
					for (var i = 0; i<stories[storyIndex].chapters.length; i++)
					{
						if (stories[storyIndex].chapters[i].title == partTitle)  // the story and part exist
							return true;
					}
				}
				else  // the story exists, but has no chapters
					return true;
			}
			
			
			return false;  // either the part doesn't exist, or the story and part don't exist
		}, processStories = function()
		{
			console.info("Finalizing story processing...");
			
			$.each(flatStories, function(i, fStory)
			{
				var storyIndex = storyExists(fStory.title);
				if (storyIndex == -1)  // the story doesn't exist, so add & process it
				{
					stories.push(new tStory(getName(fStory.title), fStory.author));
					
					var story = stories[stories.length-1];
					if (hasChapters(fStory.title))
						gatherChapters(stories.length-1, fStory.title);
					else
					{
						var chapter = 
						{
							title: story.name,
							url: fStory.url,
							datePosted: fStory.datePosted,
							content: fStory.content,
							readerData:
							{
								readOn: undefined
							}
						};
						story.chapters.push(chapter);
						
						story.parts = 1;
						story.lastUpdated = fStory.datePosted;
					}
				}
				else if (!findStoryPart(fStory.title))  // the story does exist, but if this chapter doesn't exist yet, add it
					gatherChapters(storyIndex, fStory.title);
			});
			
			// store the stories to the fs
			storyStorage.root.getFile('stories.json', {}, saveStoriesToFs);
			
			progressReporting = true;  // if we disabled progress reporting because of a retrieval from cache, turn it back on now, in case we need it later
		}, waitForStories = function()
		{
			if (storiesGathered < flatStories.length || storiesGathered == 0)
				setTimeout(waitForStories, 500);
			else
				processStories();
		}, getStoriesFromFs = function(file)
		{
			var storyCacheAccess = new FileReader();
			storyCacheAccess.onloadend = function(e)
			{
				if (this.result.length)  // there are stories cached, so let's use them
				{
					stories = JSON.parse(this.result);
					
					progressReporting = false;
					console.info("Stories retrieved from cache; checking to look for new/updated stories...");
				}
				// setTimeout(phase3, 2000);
				// we've loaded any cached stories, now kick off the rest of the story-processing extraveganza
				progressStartedAt = {time: Date.now(), storiesGathered: storiesGathered};
				$.get("/stories-by-title/", function(storyList)
				{
					var rawStoryList = sani$(storyList);
					rawStoryList.find("#content>.entry-content>ul:first-of-type>li>a").each(function()
					{
						var thisTitle = $(this).text();
						// console.debug(thisTitle);
						if (!findStoryPart(thisTitle))  // if this story doesn't exist, or it does, but this part doesn't exist
						{
							flatStories.push(new tFlatStory(this.href, thisTitle));
							fetchStory(this.href, flatStories.length-1);
						}
					});
					if (progressReporting)
					{
						progress();
						// console.debug("rawStoryList", rawStoryList);
					}
					// console.debug("flatStories", flatStories);
				});
				console.info("Gathering stories now; please standby...");
				waitForStories();
			}
			
			storyCacheAccess.readAsText(file);
		}, requestStorageAllocation = function(mb)
		{
			navigator.webkitPersistentStorage.requestQuota(1024*1024*mb, requestFSAccess);
		}, requestFSAccess = function(bytesGranted)
		{
			if (bytesGranted >= storageReservationInMB*1024*1024)
			{
				// set up access to the fs, and once it is granted, kick off the story extraveganza
				webkitRequestFileSystem(
					PERSISTENT,
					bytesGranted,
					fsAccessGranted,
					function(){console.error("Access Denied to cache data; aborting story process.");});
			}
			else
				console.error("Access not granted for enough cache storage space; aborting story process.");
		}, fsAccessGranted = function(fs)
		{
			storyStorage = fs;
			fs.root.getFile('stories.json', {create: true}, function(fe)
			{
				fe.file(getStoriesFromFs);
			});
		};
		
		// these need to update window.{functionName}, so we don't declare it w/ "var"
		clearCachedStories = function()
		{
			storyStorage.root.getFile('stories.json', {create: false}, function(fe)
			{
				fe.remove(function() {});
			});
		};
		saveStoriesToFs = function(fe)
		{
			fe.createWriter(function(fw)
			{
				fw.onwriteend = function(e)
				{
					if (!bootstrapped)
					{
						console.info("All stories gathered and processed. Loading now...");
						phase3();
					}
					else
						console.info("Cache updated!");
				};
				fw.onerror = function(e)
				{
					console.error('Something went wrong when trying to cache the processed stories: ' + e.toString());
				};
				
				// Create a new Blob and write it to log.txt.
				var storyJSON = new Blob([JSON.stringify(stories)], {type: 'text/json'});
				fw.write(storyJSON);
			});
		};
		
		
		requestStorageAllocation(storageReservationInMB);
	}, 
	angularApp, 
	phase2 = function()  // while phase1() is executing, we'll get the page ready to display all our shmanchy stories ;)
	{
		// console.debug("Phase2 started");
		
		var angularJS = document.createElement('script');
		angularJS.setAttribute('src','https://ajax.googleapis.com/ajax/libs/angularjs/1.5.9/angular.min.js');
		var angularJSsanitize = document.createElement('script');
		angularJSsanitize.setAttribute('src','//ajax.googleapis.com/ajax/libs/angularjs/1.5.9/angular-sanitize.js');
		document.head.appendChild(angularJS);
		
		// since we just appended the script tag; give angular some time to finish loading before trying to use it
		setTimeout(function()
		{
			document.head.appendChild(angularJSsanitize);
			angularApp = angular.module('storiesApp', [])
				.controller('MainCtrl', ['$scope', '$window', function($scope, $window)
				{
					$scope.stories = $window.stories;
					$scope.authorFilter = "";
					$scope.orderBy = 'lastUpdated';
					$scope.orderByReverse = true;
					$scope.currentStory = undefined;
					$scope.currentChapter = undefined;
					$scope.storyContent = "";
					
					$scope.cycleOrderBy = function()
					{
						switch ($scope.orderBy)
						{
							case "sortName":
								$scope.orderBy = "lastUpdated";
								$scope.orderByReverse = true;
								
								break;
							
							case "lastUpdated":
								$scope.orderBy = "sortName";
								$scope.orderByReverse = false;
								
								break;
						}
					};
					$scope.doAuthor = function(author)
					{
						if (author === undefined)
						{
							scrollTo(preAuthorScrollPosition);
							preAuthorScrollPosition = 0;
							author = "";
						}
						else
						{
							preAuthorScrollPosition = window.scrollY; // old: $("body").scrollTop();
							scrollToTitle();
						}
						
						$scope.authorFilter = author;
					};
					$scope.doStory = function(story, chapter)
					{
						if (story === undefined && chapter === undefined)
						{
							scrollTo(preStoryScrollPosition);
							preStoryScrollPosition = 0;
							updateTitle("Stories by Title");
							updateDate("");
							updateAuthor("");
							hideStory($scope);
							undim();
						}
						else
						{
							if (!$scope.storyContent.length)  // if we already have a story loaded and we're changing chapters, we don't want to lose our original scroll position
								preStoryScrollPosition = window.scrollY;  // old: $("body").scrollTop();
							scrollToTitle();
							dim();
							
							if (story.parts > 1)
								updateTitle(story.name + " - " + chapter.title, chapter.url);
							else
								updateTitle(story.name, chapter.url);
							
							updateDate(story.lastUpdated);
							updateAuthor(story.author);
							$scope.currentStory = story;
							$scope.currentChapter = chapter;
							showStory($scope, chapter.content);
							
							chapter.readerData.readOn = Date.now();
							updateCacheWithUpdates();
						}
					};
					$scope.storyClassesForStoryList = function(story)
					{
						return	{
									read: $scope.areAllChaptersRead(story), 
									thumbsup: $scope.storyThumbsUp(story), 
									thumbsdown: $scope.storyThumbsDown(story)
								};
					};
					$scope.shortDateFormat = function(story)
					{
						var lu = new Date(story.lastUpdated);
						
						
						return lu.getDate() + "/" + lu.getMonth() + "/" + lu.getFullYear()
					};
					$scope.areAllChaptersRead = function(story)
					{
						var readCount = 0;
						for (var i = 0; i<story.chapters.length; i++)
							!!story.chapters[i].readerData.readOn ? readCount++ : true;
						
						if (readCount == story.parts)
							return true;
						else
							return false;
					};
					$scope.markUnread = function()
					{
						$scope.currentChapter.readerData.readOn = undefined;
						updateCacheWithUpdates();
					};
					
					var findIndex = function(story, chapter)
					{
						for (var i = 0; i<story.chapters.length; i++)
						{
							if (story.chapters[i].title == chapter.title)
								return i;
						}
					};
					$scope.noStoryThumbs = function(set = false)
					{
						if (set)
							$scope.storyThumbs(undefined, set);
						else if (!$scope.currentStory.thumbs)
							return true;
						else
							return false;
					};
					$scope.storyThumbs = function(direction, set)
					{
						var s = $scope.currentStory;
						
						// if `set` was passed in as an object instead of boolean, then this is getting run from the story list instead of after a story's been chosen, so use the passed in object as the current story, and definitely don't make any modifications to it
						if (typeof set == "object")
						{
							s = set;
							set = false;
						}
						
						if (set)
						{
							s.thumbs = direction;
							updateCacheWithUpdates();
						}
						else if (!!s.thumbs && s.thumbs == direction)
							return true;
						else
							return false;
					};
					$scope.storyThumbsUp = function(set = false)
					{
						return $scope.storyThumbs("up", set);
					};
					$scope.storyThumbsDown = function(set = false)
					{
						return $scope.storyThumbs("down", set);
					};
					$scope.isPrevChapter = function()
					{
						if (findIndex($scope.currentStory, $scope.currentChapter) > 0)
							return true;
						else
							return false;
					};
					$scope.isNextChapter = function()
					{
						if (findIndex($scope.currentStory, $scope.currentChapter) < ($scope.currentStory.parts - 1))
							return true;
						else
							return false;
					};
					$scope.loadPrevChapter = function()
					{
						$scope.doStory($scope.currentStory, $scope.currentStory.chapters[findIndex($scope.currentStory, $scope.currentChapter) - 1]);
					};
					$scope.loadNextChapter = function()
					{
						$scope.doStory($scope.currentStory, $scope.currentStory.chapters[findIndex($scope.currentStory, $scope.currentChapter) + 1]);
					};
				}]).filter("storyFilter", ['$filter', function($filter)
				{
					return function (stories, search)
					{
						var a = search.author,
							u = search.$
							exactMatch = false;
						
						// if there are any quotes in the search text, then don't use our special filter, but instead use the standard exact-match filter
						if (!!u && u.search(/["']/) >= 0)
						{
							exactMatch = true;
							search.$ = u.replace(/["']/g, "");  // remove the quotes from the actual search query so the filter runs on the text alone
						}
						
						if (!exactMatch && !!u)
						{
							// if an author filter has been specified, first narrow down the stories to those which match the specified author
							if (!!a)
								stories = $filter('filter')(stories, {author: a});  // use the standard filter logic for the author filter and use only its results, since the standard filter does a good job of field-specific search
							
							u = u.split(" ");  // reformat the search text as an array of words (split by spaces)
							
							// run the normal universal filter for each of the search terms, combining all results together (may produce duplicates)
							var prelimResults = [];
							for (var i=0; i<u.length; i++)
								prelimResults = prelimResults.concat($filter('filter')(stories, u[i]));
							
							// remove any duplicates generated by the above concatination of search results
							var name,
								names = {},
								results = [];
							angular.forEach(prelimResults, function(result)
							{
								name = result.name;
								if (!(name in names))  // we haven't seen this story before, so log that we've seen it
									names[name] = 1;
								else  // we HAVE seen this story before, so log that we've seen it again
									names[name]++;
								
								// if we have seen this story the same number of times as the number of search terms, then we have a fully matching story
								if (names[name] == u.length)
									results.push(result);
							});
							
							
							return results;
						}
						else
							return $filter('filter')(stories, search);  // just wrap the standard filter logic and return its results, since its behavior is "exact match" not the "match all words somewhere" we've programmed above
					};
				}]);
		}, 1500);
		
		$("body").append('<style type="text/css">#filterBox{	height: 20px;	font-size: 12px;	width: 40%;}#orderBy{	float: right;	font-size: .9em;	color: #bbb;}#orderByChoice{	text-decoration: underline;	cursor: pointer;}.clearChanges{	text-align: right;	text-decoration: underline;}.clearChanges>span { cursor: pointer; }.thumbs { float: left; }.thumbs .changeRating{	cursor: pointer;	text-decoration: underline;}.chapterNav{	margin-top: 10px;	margin-bottom: 20px;}.chapterNav>span:first-of-type{	float: left;	text-decoration: underline;}ul.storyList { margin-left: 0; }.storyList>.story{	list-style-type: none;	margin-bottom: 10px;}.story.thumbsup { position: relative; }.story.thumbsup>.storyTitle:before{	content: "*";	position: absolute;	left: -10px;	top: 4px;	font-weight: bold;}.chapterLink { cursor: pointer; }.storyList>.story>.chapterLink{	font-weight: 600;	text-decoration: none;	color: #ccc;}.read>.chapterLink { color: #888 !important; }.storyList .byline{	padding-left: 5px;	color: #999;	font-style: italic;}.storyList .author{	color: #aaa;	cursor: pointer;}.story .lastUpdated{	padding-left: 1em;	font-size: .75em;	color: #888;	font-style: italic;	vertical-align: text-bottom;}.story .lastUpdated>.updatedPhrase{	font-size: .9em;	color: #777;}.storyList>.story>ul{	line-height: 1.4em;	margin-top: -3px;}.storyList>.story>ul>li{	display: inline-block;	padding: 0 5px;}.story>ul>li>.chapterLink { text-decoration: underline; }#storyContent{	display: none;	clear: both;}</style>');
		
		// console.debug("Phase2 completed");
	}, phase3 = function()  // this phase will take the stories and use Angular to display them on the page
	{
		var storyListTemplate = '<div class="filterStories" ng-show="!storyContent">	<input type="text" id="filterBox" ng-model="universalFilter" placeholder="Type here to filter stories...">	<span id="orderBy">Order by: <span id="orderByChoice" ng-click="cycleOrderBy()">{{ orderBy }}</span></span></div><div class="clearChanges" ng-show="authorFilter&&!storyContent">	<span ng-click="doAuthor()">Clear Author Filter</span></div><div class="thumbs" ng-if="storyContent">	Thumbs		<span ng-show="noStoryThumbs()">				<span class="changeRating" ng-click="storyThumbsUp(true)">up</span> / <span class="changeRating" ng-click="storyThumbsDown(true)">down</span>		</span>		<span class="changeRating" ng-show="!noStoryThumbs()" ng-click="noStoryThumbs(true)">			<span ng-show="storyThumbsUp()">Up!</span><span ng-show="storyThumbsDown()">Down :(</span>		</span></div><div class="clearChanges" ng-show="storyContent">	<span ng-click="doStory()">Close Story</span></div><div class="clearChanges" ng-show="storyContent&&currentChapter.readerData.readOn">	<span ng-click="markUnread()">Mark Chapter as Unread</span></div><div ng-if="storyContent" class="clearChanges chapterNav">	<span ng-show="isPrevChapter()" ng-click="loadPrevChapter()">Previous Chapter</span>	<span ng-show="isNextChapter()" ng-click="loadNextChapter()">Next Chapter</span></div><ul class="storyList" ng-hide="storyContent">	<li class="story" ng-repeat="story in stories | storyFilter:{author:authorFilter,$:universalFilter} | orderBy:orderBy:orderByReverse" ng-class="storyClassesForStoryList(story)" ng-show="!storyThumbsDown(story)">		<span class="storyTitle chapterLink" ng-click="doStory(story, story.chapters[0])" href="{{story.chapters[0].url}}" rel="bookmark">{{story.name}}</span>		<span class="byline"> by <span class="author" ng-click="doAuthor(story.author)">{{story.author}}</span></span>		<span class="lastUpdated">			<span class="updatedPhrase">{{ story.parts==1 ? "posted" : "updated" }}</span>				<span class="updatedDate">{{ shortDateFormat(story) }}</span>		</span>		<ul ng-if="story.parts>1">			<li ng-repeat="chapter in story.chapters | orderBy:\'number\'" ng-class="chapter.readerData.readOn?\'read\':\'\'">				<span class="chapterLink" ng-click="doStory(story, chapter)" href="{{chapter.url}}" rel="bookmark">{{chapter.title}}</span>			</li>		</ul>	</li></ul><div id="storyContent" ng-show="storyContent" ng-bind-html="storyContent"></div><div ng-if="storyContent" class="clearChanges chapterNav">	<span ng-show="isPrevChapter()" ng-click="loadPrevChapter()">Previous Chapter</span>	<span ng-show="isNextChapter()" ng-click="loadNextChapter()">Next Chapter</span></div><div class="clearChanges" ng-show="authorFilter&&!storyContent">	<span ng-click="doAuthor()">Clear Author Filter</span></div><div class="clearChanges" ng-show="storyContent">	<span ng-click="doStory()">Close Story</span></div><div class="clearChanges" ng-show="storyContent&&currentChapter.readerData.readOn">	<span ng-click="markUnread()">Mark Chapter as Unread</span></div>';
		
		$("html").attr("ng-controller", "MainCtrl");
		$(".entry-content").parents("article").slice(1).remove()
		$("#featured-content,.post-thumbnail").remove();
		updateTitle("Stories by Title");
		$("span.entry-date>a").attr("href", "").css("cursor", "arrow");
		$("time.entry-date").attr("datetime", "");
		updateDate("");
		$(".author>a").attr("href", "").css("cursor", "arrow");
		updateAuthor("");
		$(".comments-link").remove();
		scrollToTitle();
		$(".entry-content").empty().append(storyListTemplate);
		
		angular.bootstrap(document, ["storiesApp", "ngSanitize"]);
		bootstrapped = true;
		
		console.info("Stories loaded. Enjoy :)");
	};

setTimeout(phase1, 3000);
setTimeout(phase2, 200);
console.log("");console.log("");console.log("");console.log("");
console.log("For the fastest story loading time, please close the devtools now. Loading will begin in 3 seconds.")