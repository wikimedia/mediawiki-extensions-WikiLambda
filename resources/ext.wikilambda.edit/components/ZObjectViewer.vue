<template>
	<!--
		WikiLambda Vue interface module for top-level view encapsulation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<!-- TODO: Add a loading indicator, once T254695 is done upstream. -->
	<div id="ext-wikilambda-view">
		<z-object
			:persistent="true"
		></z-object>
	</div>
</template>

<script>
var ZObject = require( './ZObject.vue' );

module.exports = {
	name: 'ZObjectViewer',
	components: {
		'z-object': ZObject
	}
};
</script>

<style lang="less">
.ext-wikilambda-view-nojsfallback {
	display: none;
}

.ext-wikilambda-view-nojswarning {
	font-weight: bold;
	margin-bottom: 1em;
}
</style>
