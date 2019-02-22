<div class="filterStories" ng-show="!storyContent">
	<input type="text" id="filterBox" ng-model="universalFilter" placeholder="Type here to filter stories...">
	<span id="orderBy">Order by: <span id="orderByChoice" ng-click="cycleOrderBy()">{{ orderBy }}</span></span>
</div>
<div class="clearChanges" ng-show="authorFilter&&!storyContent">
	<span ng-click="doAuthor()">Clear Author Filter</span>
</div>
<div class="thumbs" ng-if="storyContent">
	Thumbs
		<span ng-show="noStoryThumbs()">
				<span class="changeRating" ng-click="storyThumbsUp(true)">up</span> / <span class="changeRating" ng-click="storyThumbsDown(true)">down</span>
		</span>
		<span class="changeRating" ng-show="!noStoryThumbs()" ng-click="noStoryThumbs(true)">
			<span ng-show="storyThumbsUp()">Up!</span><span ng-show="storyThumbsDown()">Down :(</span>
		</span>
</div>
<div class="clearChanges" ng-show="storyContent">
	<span ng-click="doStory()">Close Story</span>
</div>
<div class="clearChanges" ng-show="storyContent&&currentChapter.readerData.readOn">
	<span ng-click="markUnread()">Mark Chapter as Unread</span>
</div>
<div ng-if="storyContent" class="clearChanges chapterNav">
	<span ng-show="isPrevChapter()" ng-click="loadPrevChapter()">Previous Chapter</span>
	<span ng-show="isNextChapter()" ng-click="loadNextChapter()">Next Chapter</span>
</div>
<ul class="storyList" ng-hide="storyContent">
	<li class="story" ng-repeat="story in stories | storyFilter:{author:authorFilter,$:universalFilter} | orderBy:orderBy:orderByReverse" ng-class="storyClassesForStoryList(story)" ng-show="!storyThumbsDown(story)">
		<span class="storyTitle chapterLink" ng-click="doStory(story, story.chapters[0])" href="{{story.chapters[0].url}}" rel="bookmark">{{story.name}}</span>
		<span class="byline"> by <span class="author" ng-click="doAuthor(story.author)">{{story.author}}</span></span>
		<span class="lastUpdated">
			<span class="updatedPhrase">{{ story.parts==1 ? "posted" : "updated" }}</span>
				<span class="updatedDate">{{ shortDateFormat(story) }}</span>
		</span>
		<ul ng-if="story.parts>1">
			<li ng-repeat="chapter in story.chapters | orderBy:\'number\'" ng-class="chapter.readerData.readOn?\'read\':\'\'">
				<span class="chapterLink" ng-click="doStory(story, chapter)" href="{{chapter.url}}" rel="bookmark">{{chapter.title}}</span>
			</li>
		</ul>
	</li>
</ul>
<div id="storyContent" ng-show="storyContent" ng-bind-html="storyContent"></div>
<div ng-if="storyContent" class="clearChanges chapterNav">
	<span ng-show="isPrevChapter()" ng-click="loadPrevChapter()">Previous Chapter</span>
	<span ng-show="isNextChapter()" ng-click="loadNextChapter()">Next Chapter</span>
</div>
<div class="clearChanges" ng-show="authorFilter&&!storyContent">
	<span ng-click="doAuthor()">Clear Author Filter</span>
</div>
<div class="clearChanges" ng-show="storyContent">
	<span ng-click="doStory()">Close Story</span>
</div>
<div class="clearChanges" ng-show="storyContent&&currentChapter.readerData.readOn">
	<span ng-click="markUnread()">Mark Chapter as Unread</span>
</div>