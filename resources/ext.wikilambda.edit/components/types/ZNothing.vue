<template>
	<div class="ext-wikilambda-nothing">
		{{ nothingLabel }}
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

module.exports = {
	computed: $.extend( mapGetters( [ 'getZkeyLabels' ] ),
		{
			nothingLabel: function () {
				return this.getZkeyLabels[ Constants.Z_NOTHING ];
			}
		}
	),
	methods: mapActions( [ 'fetchZKeys' ] ),
	mounted: function () {
		this.fetchZKeys( [ Constants.Z_NOTHING ] );
	}
};
</script>

<style lang="less">
.ext-wikilambda-nothing {
	font-style: italic;
	font-size: 0.8em;
	color: #555;
}
</style>
