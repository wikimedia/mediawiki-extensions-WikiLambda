<template>
	<!--
		WikiLambda Vue component for displaying and triggering the result of a tester against a given implementation.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<cdx-button
		class="ext-wikilambda-tester-result"
		:action="testerStatus"
		type="primary"
		x:disabled="!zImplementationId || !zTesterId || typeof testerStatus === 'undefined'"
		@click="emitTesterKeys"
	>
		<template v-if="!zImplementationId || !zTesterId">
			{{ $i18n( 'wikilambda-tester-status-pending' ).text() }}
		</template>
		<template v-else-if="testerStatus === true">
			{{ $i18n( 'wikilambda-tester-status-passed' ).text() }}
		</template>
		<template v-else-if="testerStatus === false">
			{{ $i18n( 'wikilambda-tester-status-failed' ).text() }}
		</template>
		<template v-else>
			{{ $i18n( 'wikilambda-tester-status-running' ).text() }}
		</template>
	</cdx-button>
</template>

<script>
var mapGetters = require( 'vuex' ).mapGetters,
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	typeUtils = require( '../../mixins/typeUtils.js' );

// @vue/component
module.exports = exports = {
	components: {
		'cdx-button': CdxButton
	},
	mixins: [ typeUtils ],
	props: {
		zFunctionId: {
			type: String,
			required: true
		},
		zImplementationId: {
			type: String,
			required: true
		},
		zTesterId: {
			type: String,
			required: true
		}
	},
	computed: $.extend( mapGetters( [
		'getZTesterResults'
	] ), {
		testerStatus: function () {
			return this.getZTesterResults( this.zFunctionId, this.zTesterId, this.zImplementationId );
		},
		resultClass: function () {
			if ( !this.zImplementationId || !this.zTesterId ) {
				return '';
			}

			if ( this.testerStatus === true ) {
				return 'progressive';
			}

			if ( this.testerStatus === false ) {
				return 'destructive';
			}

			return '';
		}
	} ),
	methods: {
		emitTesterKeys: function () {
			this.$emit( 'set-keys', {
				zImplementationId: this.zImplementationId,
				zTesterId: this.zTesterId
			} );
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-tester-result {
	text-align: center;
	background: #ddd;
	cursor: pointer;
	width: 100%;
	border: transparent;
	padding: 5px;
	text-decoration: none;
}

</style>
