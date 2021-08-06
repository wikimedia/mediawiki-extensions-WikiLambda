<template>
	<div v-if="zobject.length">
		<z-multilingual-string
			:zobject-id="labelsId"
		></z-multilingual-string>
		<z-inline-tester-call
			v-if="call"
			:zobject-id="call.id"
		></z-inline-tester-call>
		<z-inline-tester-validation
			v-if="validator"
			:zobject-id="validator.id"
		></z-inline-tester-validation>
		<div>
			<button @click="saveAdHocTester">
				{{ $i18n( 'wikilambda-savenew' ) }}
			</button>
		</div>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	typeUtils = require( '../../mixins/typeUtils.js' ),
	schemata = require( '../../mixins/schemata.js' ),
	ZInlineTesterCall = require( './ZInlineTesterCall.vue' ),
	ZInlineTesterValidation = require( './ZInlineTesterValidation.vue' ),
	ZMultilingualString = require( '../types/ZMultilingualString.vue' );

module.exports = {
	components: {
		'z-inline-tester-call': ZInlineTesterCall,
		'z-inline-tester-validation': ZInlineTesterValidation,
		'z-multilingual-string': ZMultilingualString
	},
	mixins: [ typeUtils, schemata ],
	props: {
		zobjectId: {
			type: Number,
			required: true
		},
		zTesterListId: {
			type: Number,
			required: true
		}
	},
	computed: $.extend( mapGetters( [
		'getZObjectChildrenById',
		'getZObjectAsJsonById',
		'getUserZlangZID',
		'getCurrentZObjectId',
		'getNestedZObjectById',
		'getNextObjectId'
	] ), {
		zobject: function () {
			return this.getZObjectChildrenById( this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_PERSISTENTOBJECT_VALUE
			] ).id );
		},
		labelsId: function () {
			return this.getNestedZObjectById( this.zobjectId, [
				Constants.Z_PERSISTENTOBJECT_LABEL
			] ).id;
		},
		zTesterList: function () {
			return this.getZObjectChildrenById( this.zTesterListId );
		},
		call: function () {
			return this.findKeyInArray( Constants.Z_TESTER_CALL, this.zobject );
		},
		validator: function () {
			return this.findKeyInArray( Constants.Z_TESTER_VALIDATION, this.zobject );
		}
	} ),
	methods: $.extend( mapActions( [
		'saveNewTester'
	] ), {
		saveAdHocTester: function () {
			this.saveNewTester( {
				testerId: this.zobjectId,
				nextTesterIndex: this.zTesterList.length,
				parent: this.zTesterListId
			} );
		}
	} )
};
</script>
