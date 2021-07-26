<template>
	<!--
		WikiLambda Vue component for displaying and triggering the result of a tester against a given implementation.

		@copyright 2020–2021 WikiLambda team; see AUTHORS.txt
		@license MIT
	-->
	<button
		class="ext-wikilambda-tester-result"
		:class="resultClass"
		:disabled="!zImplementationId || !zTesterId || typeof testerStatus === 'undefined'"
		@click="initiateTester"
	>
		<template v-if="!zImplementationId || !zTesterId">
			{{ $i18n( 'wikilambda-tester-status-pending' ) }}
		</template>
		<template v-else-if="testerStatus === true">
			{{ $i18n( 'wikilambda-tester-status-passed' ) }}
		</template>
		<template v-else-if="testerStatus === false">
			{{ $i18n( 'wikilambda-tester-status-failed' ) }}
		</template>
		<template v-else>
			{{ $i18n( 'wikilambda-tester-status-running' ) }}
		</template>
	</button>
</template>

<script>
var mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions;

module.exports = {
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
		'getZkeys',
		'getZTesterResults'
	] ), {
		testerStatus: function () {
			return this.getZTesterResults( this.zFunctionId, this.zTesterId, this.zImplementationId );
		},
		resultClass: function () {
			if ( this.testerStatus === true ) {
				return 'test-passed';
			}

			if ( this.testerStatus === false ) {
				return 'test-failed';
			}

			return '';
		}
	} ),
	methods: $.extend( mapActions( [
		'fetchZKeys',
		'prepareTest',
		'performTest',
		'resetTestResult'
	] ), {
		initiateTester: function () {
			this.prepareTest( {
				zFunctionId: this.zFunctionId,
				zImplementationId: this.zImplementationId,
				zTesterId: this.zTesterId
			} );
		}
	} ),
	watch: {
		zTesterId: function () {
			this.initiateTester();
		},
		zImplementationId: function () {
			this.initiateTester();
		}
	},
	mounted: function () {
		this.initiateTester();
	},
	beforeDestroy: function () {
		this.resetTestResult( {
			zFunctionId: this.zFunctionId,
			zImplementationId: this.zImplementationId,
			zTesterId: this.zTesterId
		} );
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

.ext-wikilambda-tester-result.test-passed {
	background: #007400;
	color: #fff;
}

.ext-wikilambda-tester-result.test-failed {
	background: #f00;
	color: #fff;
}
</style>
