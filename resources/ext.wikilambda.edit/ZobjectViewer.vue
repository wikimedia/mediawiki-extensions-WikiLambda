<template>
	<!--
		WikiLambda Vue interface module for top-level view encapsulation.

		@copyright 2020 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<!-- TODO: Add a loading indicator, once T254695 is done upstream. -->
	<div id="ext-wikilambda-view">
		<full-zobject :zobject="zobject"
			:persistent="true"
			:viewmode="true"
		></full-zobject>
	</div>
</template>

<script>
var FullZobject = require( './FullZobject.vue' );

module.exports = {
	name: 'ZobjectViewer',
	data: function () {
		var editingData = mw.config.get( 'extWikilambdaEditingData' ),
			zobject = editingData.zobject;

		return {
			zobject: zobject
		};
	},
	components: {
		'full-zobject': FullZobject
	}
};
</script>
